from __future__ import print_function
import boto3, json
import logging
import os
from botocore.exceptions import ClientError

logger = logging.getLogger()

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('TABLENAME'))

def lambda_handler(event, context):
    print(event)
    return new_order(event['detail'])
    
def new_order(body):
    print(body)
    item = { 
                'accountid': body['order']['accountid'],
                'vendorid': body['order']["vendorid"],
                'orderdate':body['order']["orderdate"],
                'city':body['order']["city"],
                'details':{
                    'coffeetype': body['order']['details']['coffeetype'],
                    'coffeesize': body['order']['details']["coffeesize"],
                    'unitprice': body['order']['details']["unitprice"],
                    'quantity': body['order']['details']["quantity"]
                },
            }
    try:
        response = table.put_item(Item = item)
        logger.info("PutItem %s to table %s.",body,table)
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
        logger.exception("Couldn't PutItem %s to table %s",body,table)
        raise