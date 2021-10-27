## Example
This example is designed for a concept mobile application called Skip the Line, which allows user to pre-order takeaway coffee while they are in transit. Just as the train pulls into the station, the user can order a coffee and pick it up on the way past the coffee shop.

In this example Amazon EventBridge rules are used to invoke Lambda functions when events are added to the EventBus. The EventBus sits behind a HTTP API endpoint, the client application pass a request to the api endpoint which includes the attribute ``` 'eventtype':[new_order] ```. The EventBus matches the attribute to a rule which then triggers a Lambda target. The advantage to using this pattern is that the API Gateway is configured with a single API endpoint for the client. The EventBridge handles routing of the request to the Lambda functions using rules. The EventBus rules can be easily created and modified, which simplifies the process of building event-driven architectures

The Amazon DynamoDB table is partitioned on an accountid attribute and also includes a sort key on the vendorid attribute, together they form the primary key. The example also demonstrates using Python to put, update and delete items in Amazon DynamoDB.



![architecture](./images/architecture_1.png "Architecture")


## Setup

You will need to download and install [Node.js](https://nodejs.org/en/download/) before you can start using the AWS Cloud Development Kit.


This example is developed using the AWS CDK and Typescript, so you will need to install both Typescript and the CDK using the following commands
```
npm install -g typescript
npm install -g aws-cdk@latest
```
Since this CDK project uses ['Assests'](https://docs.aws.amazon.com/cdk/latest/guide/assets.html), you might need to run the following command to provision resources the AWS CDK will need to perform the deployment.

```bash 
cdk bootstrap
```

The testing scripts can be executed using Jupyter Notebook. There are a few methods for installing Jupyter Notebooks. These instructions will help you get to started with [JupyterLab](https://jupyter.org/install) installation. 

You can also install Jupyter Notebooks as part of [Anaconda](https://docs.anaconda.com/anaconda/install/index.html) installation.

To download this example, you will need to install [Git](https://github.com/git-guides/install-git). After installing git follow these [instructions](https://github.com/git-guides/git-clone) to learn how to clone the repository.

After the repository has been cloned set the command prompt path to the cloned directory and run the following command to install the project dependencies.

```bash
npm install
```

**cdk synth** executes the application which translates the Typescript code into an AWS CloudFormation template.

```bash
cdk synth
```

After the synth command has generated the template use the  **cdk deploy** command to deploy the template to AWS CloudFormation and build the stack. You will be prompted to confirm the deployment with y/n.

```bash
cdk deploy
```

## Run the Example
Open the Jupyter Notebook in the **jupyter_notebook directory** follow the instructions.


## Cleanup
From the command prompt execute the following command: **cdk destroy**

## Deployed Resources
|	Identifier	|	Service	|	Type	|
|	:---	|	:---	|	:---	|
|	EventSourcingEventbridgeS-aws generated name	|	Lambda	|	Function	|
|	EventSourcingEventbridgeS-aws generated name	|	IAM	|	Role	|
|	event_sourcing_eventbridge	|	DynamoDB	|	Table	|
|	event_sourcing_eventbridge_api_role	|	IAM	|	Role	|
|	/demo/event_sourcing_eventbridge	|	Logs	|	LogGroup	|
|	event_sourcing_eventbridge|event_sourcing_eventbridge_logger	|	Events	|	Rule	|
|	event_sourcing_eventbridge_put_item	|	Lambda	|	Function	|
|	event_sourcing_eventbridge_update_item	|	Lambda	|	Function	|
|	event_sourcing_eventbridge_delete_item	|	Lambda	|	Function	|
|	event_sourcing_eventbridge_lambda_put	|	IAM	|	Role	|
|	event_sourcing_eventbridge_lambda_update	|	IAM	|	Role	|
|	event_sourcing_eventbridge_lambda_delete	|	IAM	|	Role	|
|	event_sourcing_eventbridge|event_sourcing_eventbridge_new_order	|	Events	|	Rule	|
|	event_sourcing_eventbridge|event_sourcing_eventbridge_update_order	|	Events	|	Rule	|
|	event_sourcing_eventbridge|event_sourcing_eventbridge_delete_order	|	Events	|	Rule	|