#   ====================================================================================================================
Feature: Feature T2 -Moneris detokenize
#   ====================================================================================================================
#------------------------------------------------------------------------------------------------------------------------
Scenario: S2.1 - detokenise success
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template detokeniseRequest-template.xml and values
		|  token            | messageId | wsuId  | wsse.username | wsse.password |
		|  1111000022220000 |  msgId001 | someId | myUser    	 | myPwd         |
	And   response uses template Moneris-detokenizeResponse-template.xml and values
		|  dataKey         	 |  pan           	  | responseCode	| responseFlag	| message | cardType |
		|  1111000022220000  |  1111000033330000  | 100 			| ACCEPT 	    | ACCEPT  | V        |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
	| ccDeTokenizeService.run | vault.creditCardNumber | reasonCode | rm.rflag |
	| true        			  | 1111000033330000    | 100        | ACCEPT   |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S2.2 - detokenise failure - missing Required field TOKEN
#------------------------------------------------------------------------------------------------------------------------
Given The application target vault is set to Moneris
And   request uses file detokeniseRequest-tokenMissing.xml
And the request is stubbed to return 200
When  dispatch endpoint is called with templated request
Then  The response code is 200
And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
	| ccDeTokenizeService.run | reasonCode | rm.rflag |
	| true        			  | 101        | REJECT   |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S2.10 - detokenise failure - null responseCode
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template detokeniseRequest-template.xml and values
		|  token            | messageId | wsuId  | wsse.username | wsse.password |
		|  1111000022220000 |  msgId001 | someId | myUser    	 | myPwd         |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message |
		| null 			| OK      |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccDeTokenizeService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			  | 106        | REJECT   | UNKWNERROR |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S2.10.1 - detokenise failure - null DataKey,cardType
#------------------------------------------------------------------------------------------------------------------------
		Given The application target vault is set to Moneris
		Given The application target vault is set to Moneris
		And   request uses template detokeniseRequest-template.xml and values
			|  token            | messageId | wsuId  | wsse.username | wsse.password |
			|  1111000022220000 |  msgId001 | someId | myUser    	 | myPwd         |
		And   response uses template Moneris-response-failure-full.xml and values
			| responseCode	| message 	 | dataKey | cardType |
			| 106 			| UNKWNERROR | null    | null     |
		And the request is stubbed to return 200
		When  dispatch endpoint is called with templated request
		Then  The response code is 200
		And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
			| ccDeTokenizeService.run | reasonCode | rm.rflag | rm.rmsg    |
			| true        			  | 106        | REJECT   | UNKWNERROR |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S2.10.2 - detokenise failure - 'na' cardType
#------------------------------------------------------------------------------------------------------------------------
		Given The application target vault is set to Moneris
		Given The application target vault is set to Moneris
		And   request uses template detokeniseRequest-template.xml and values
			|  token            | messageId | wsuId  | wsse.username | wsse.password |
			|  1111000022220000 |  msgId001 | someId | myUser    	 | myPwd         |
		And   response uses template Moneris-response-failure-full.xml and values
			| responseCode	| message 	 | dataKey | cardType |
			| 106 			| UNKWNERROR |     | null     |
		And the request is stubbed to return 200
		When  dispatch endpoint is called with templated request
		Then  The response code is 200
		And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
			| ccDeTokenizeService.run | reasonCode | rm.rflag | rm.rmsg    |
			| true        			  | 106        | REJECT   | UNKWNERROR |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S2.11 - detokenise failure - null responseMessage
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template detokeniseRequest-template.xml and values
		|  token            | messageId | wsuId  | wsse.username | wsse.password |
		|  1111000022220000 |  msgId001 | someId | myUser    	 | myPwd         |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message |
		| 100 			| null    |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccDeTokenizeService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			  | 106        | REJECT   | UNKWNERROR |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S2.12 - detokenise failure - UNKWNERROR
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template detokeniseRequest-template.xml and values
		|  token            | messageId | wsuId  | wsse.username | wsse.password |
		|  1111000022220000 |  msgId001 | someId | myUser    	 | myPwd         |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message 		|
		| 106 			| UNKWNERROR    |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccDeTokenizeService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			  | 106        | REJECT   | UNKWNERROR |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S2.13 - detokenise failure - NOACCESS
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template detokeniseRequest-template.xml and values
		|  token            | messageId | wsuId  | wsse.username | wsse.password |
		|  1111000022220000 |  msgId001 | someId | myUser    	 | myPwd         |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message 	|
		| 200 			| NOACCESS  |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccDeTokenizeService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			  | 200        | REJECT   | NOACCESS |
##------------------------------------------------------------------------------------------------------------------------
Scenario: S2.14 - detokenise failure - NOSERVICE
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template detokeniseRequest-template.xml and values
		|  token            | messageId | wsuId  | wsse.username | wsse.password |
		|  1111000022220000 |  msgId001 | someId | myUser    	 | myPwd         |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message 	|
		| 201 			| NOSERVICE  |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccDeTokenizeService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			  | 201        | REJECT   | NOSERVICE |
#------------------------------------------------------------------------------------------------------------------------
