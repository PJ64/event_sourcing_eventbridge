from __future__ import print_function
import boto3
import json
import logging
import os
from botocore.exceptions import ClientError

logger = logging.getLogger()

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('TABLENAME'))


def lambda_handler(event, context):
    return update_order(event['detail'])


def update_order(body):
    print(body)

    try:
        response = table.update_item(
            Key={
                'accountid': body['order']['accountid'],
                'vendorid': body['order']["vendorid"]
            },
            UpdateExpression="set details.coffeetype=:ct, details.coffeesize=:cs, details.quantity=:q",
            ExpressionAttributeValues={
                ':ct': body['order']['details']['coffeetype'],
                ':cs': body['order']['details']["coffeesize"],
                ':q': body['order']['details']["quantity"]
            },
            ReturnValues="UPDATED_NEW"
        )
        logger.info("PutItem %s to table %s.", body, table)
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'body': json.dumps(response)
        }
    except ClientError:
        logger.exception("Couldn't PutItem %s to table %s", body, table)
        raise
