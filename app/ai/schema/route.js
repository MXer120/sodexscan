
import { NextResponse } from 'next/server'

export async function GET() {
    const schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "definitions": {
            "wallet": {
                "type": "object",
                "properties": {
                    "wallet_address": { "type": "string" },
                    "metrics": {
                        "type": "object",
                        "properties": {
                            "realized_profit": {
                                "type": "object",
                                "properties": {
                                    "value": { "type": "number" },
                                    "unit": { "type": "string" }
                                }
                            },
                            "volume": {
                                "type": "object",
                                "properties": {
                                    "value": { "type": "number" },
                                    "unit": { "type": "string" }
                                }
                            },
                            "unrealized_profit": {
                                "type": "object",
                                "properties": {
                                    "value": { "type": "number" },
                                    "unit": { "type": "string" }
                                }
                            }
                        }
                    },
                    "last_updated": { "type": "string", "format": "date-time" }
                }
            }
        },
        "type": "object",
        "properties": {
            "data": {
                "oneOf": [
                    { "$ref": "#/definitions/wallet" },
                    { "type": "array", "items": { "$ref": "#/definitions/wallet" } }
                ]
            }
        }
    }

    return NextResponse.json(schema, {
        headers: {
            'Content-Type': 'application/schema+json',
            'Cache-Control': 'public, max-age=3600'
        }
    })
}
