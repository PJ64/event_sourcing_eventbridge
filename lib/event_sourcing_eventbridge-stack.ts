import * as cdk from '@aws-cdk/core';
import { EventBus, Rule } from '@aws-cdk/aws-events';
import { CfnIntegration, CfnRoute, HttpApi } from '@aws-cdk/aws-apigatewayv2';
import { Effect, PolicyStatement, Role, ServicePrincipal, ManagedPolicy } from '@aws-cdk/aws-iam';
import { LogGroup } from '@aws-cdk/aws-logs';
import { CloudWatchLogGroup, LambdaFunction } from '@aws-cdk/aws-events-targets';
import { Function, Runtime, Code } from '@aws-cdk/aws-lambda'
import { Table, AttributeType, ProjectionType } from '@aws-cdk/aws-dynamodb';

export class EventSourcingEventbridgeStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const eventBus = new EventBus(this, 'eventBus', {
      eventBusName: 'event_sourcing_eventbridge'
    });

    //Create DynamoDB table to hold the orders
    const dynamoTable = new Table(this, "DynamoDBTable", {
      partitionKey: {
        name: 'accountid',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'vendorid',
        type: AttributeType.STRING
      },
      tableName: 'event_sourcing_eventbridge',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    //DynamoDB local secondary index with accountid as the partition key and orderdate as the sortkey
    dynamoTable.addLocalSecondaryIndex({
      indexName: 'lsi_accountid_orderdate',
      sortKey: {
        name: 'orderdate',
        type: AttributeType.STRING
      },
      nonKeyAttributes: ["vendorid", "details"],
      projectionType: ProjectionType.INCLUDE
    });

    //DynamoDB global secondary index with vendorid as the partition key and orderdate as the sortkey
    dynamoTable.addGlobalSecondaryIndex({
      indexName: 'gsi_vendorid_orderdate',
      partitionKey: {
        name: 'vendorid',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'orderdate',
        type: AttributeType.STRING
      },
      nonKeyAttributes: ["vendorid", "accountid", "details"],
      projectionType: ProjectionType.INCLUDE
    });

    /* IAM Role */
    const lambda_put_service_role = new Role(this, "lambda_put_service_role", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      roleName: "event_sourcing_eventbridge_lambda_put"
    });

    lambda_put_service_role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));

    lambda_put_service_role.addToPolicy(new PolicyStatement({
      resources: [dynamoTable.tableArn],
      actions: ['dynamodb:PutItem'],
    }));

    const lambda_update_service_role = new Role(this, "lambda_update_service_role", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      roleName: "event_sourcing_eventbridge_lambda_update"
    });

    lambda_update_service_role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));

    lambda_update_service_role.addToPolicy(new PolicyStatement({
      resources: [dynamoTable.tableArn],
      actions: ['dynamodb:UpdateItem'],
    }));

    /* Lambda function */
    const lambdaPutFunction = new Function(this, 'lambdaPutFunction', {
      runtime: Runtime.PYTHON_3_7,
      handler: "lambda_function.lambda_handler",
      code: Code.fromAsset("resources/function_item_put"),
      functionName: "event_sourcing_eventbridge_put_item",
      role: lambda_put_service_role,
      environment: {
        'TABLENAME': dynamoTable.tableName
      }
    });

    const lambdaUpdateFunction = new Function(this, 'lambdaUpdateFunction', {
      runtime: Runtime.PYTHON_3_7,
      handler: "lambda_function.lambda_handler",
      code: Code.fromAsset("resources/function_item_update"),
      functionName: "event_sourcing_eventbridge_update_item",
      role: lambda_update_service_role,
      environment: {
        'TABLENAME': dynamoTable.tableName
      }
    });

    /* LOGGING */
    const eventLoggerRule = new Rule(this, "EventLoggerRule", {
      ruleName: "event_sourcing_eventbridge_logger",
      description: "Log all events",
      eventPattern: {
        region: ["ap-southeast-2"]
      },
      eventBus: eventBus
    });

    const new_order = new Rule(this, "new_order", {
      description: "Trigger lambda",
      ruleName: "event_sourcing_eventbridge_new_order",
      eventPattern: {
        detail: {
          order: {
            eventtype: [
              "new_order"
            ]
          }
        }
      },
      eventBus: eventBus
    })

    new_order.addTarget(new LambdaFunction(lambdaPutFunction, {
      maxEventAge: cdk.Duration.hours(2), // Otional: set the maxEventAge retry policy
      retryAttempts: 2, // Optional: set the max number of retry attempts
    }));

    const update_order = new Rule(this, "update_order", {
      description: "Trigger lambda",
      ruleName: "event_sourcing_eventbridge_update_order",
      eventPattern: {
        detail: {
          order: {
            eventtype: [
              "update_order"
            ]
          }
        }
      },
      eventBus: eventBus
    })

    update_order.addTarget(new LambdaFunction(lambdaUpdateFunction, {
      maxEventAge: cdk.Duration.hours(2), // Otional: set the maxEventAge retry policy
      retryAttempts: 2, // Optional: set the max number of retry attempts
    }));

    const logGroup = new LogGroup(this, 'EventLogGroup', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      logGroupName: '/demo/event_sourcing_eventbridge',
    });

    eventLoggerRule.addTarget(new CloudWatchLogGroup(logGroup));


    /* API */
    const httpApi = new HttpApi(this, 'event_sourcing_eventbridge');

    /* There's no Eventbridge integration available as CDK L2 yet, so we have to use L1 and create Role, Integration and Route */
    const apiRole = new Role(this, 'EventBridgeIntegrationRole', {
      roleName: "event_sourcing_eventbridge_api_role",
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });

    apiRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [eventBus.eventBusArn],
        actions: ['events:PutEvents'],
      })
    );

    const eventbridgeIntegration = new CfnIntegration(
      this,
      'EventBridgeIntegration',
      {
        apiId: httpApi.httpApiId,
        integrationType: 'AWS_PROXY',
        integrationSubtype: 'EventBridge-PutEvents',
        credentialsArn: apiRole.roleArn,
        requestParameters: {
          Source: 'WebApp',
          DetailType: 'event_sourcing_eventbridge',
          Detail: '$request.body',
          EventBusName: eventBus.eventBusArn,
        },
        payloadFormatVersion: '1.0',
        timeoutInMillis: 10000,
      }
    );

    new CfnRoute(this, 'EventRoute', {
      apiId: httpApi.httpApiId,
      routeKey: 'POST /',
      target: `integrations/${eventbridgeIntegration.ref}`,
    });

    new cdk.CfnOutput(this, 'apiUrl', { value: httpApi.url!, description: "HTTP API endpoint URL" });
  }
}
