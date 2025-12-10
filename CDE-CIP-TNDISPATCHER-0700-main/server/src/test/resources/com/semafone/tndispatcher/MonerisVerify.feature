#   ====================================================================================================================
Feature: Feature T3 -Moneris verify
#   ====================================================================================================================
#------------------------------------------------------------------------------------------------------------------------
Scenario: S3.1 - verify success
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template verifyRequest-template.xml and values
		|  token   			| messageId | wsuId | wsse.username | wsse.password  |
		|  1234123412341122 | msgId  	| someId | myUser    	| myPwd          |
	And   response uses template Moneris-lookupMaskedResponse-template.xml and values
		|  dataKey           | responseCode	| responseFlag	| message | cardType | maskedPan | responseFlag |
		|  0000000000001122  | 100 			| ACCEPT 	    | OK  	  | V        | 123       | ACCEPT       |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccVerifyService.run | reasonCode | vault.token 	  | vault.cardType | rm.rflag | rm.rmsg |
		| true       		  | 100        | 1234123412341122 | V              | ACCEPT   | OK   	|
#------------------------------------------------------------------------------------------------------------------------
Scenario: S3.2 - Verify failure - missing Required field token
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses file verifyRequest-accNoMissing.xml
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccVerifyService.run	| reasonCode | rm.rflag |
		| true             		| 101        | REJECT   |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S3.10 - Verify failure - null responseCode
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template verifyRequest-template.xml and values
		|  token   			| messageId | wsuId | wsse.username | wsse.password  |
		|  1234123412341122 | msgId  	| someId | myUser    	| myPwd          |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message |
		| null 			| OK      |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccVerifyService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			  | 106        | REJECT   | UNKWNERROR |
#------------------------------------------------------------------------------------------------------------------------
#------------------------------------------------------------------------------------------------------------------------
Scenario: S3.11 - Verify failure - null responseMessage
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template verifyRequest-template.xml and values
		|  token   			| messageId | wsuId | wsse.username | wsse.password  |
		|  1234123412341122 | msgId  	| someId | myUser    	| myPwd          |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message |
		| 100 			| null    |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccVerifyService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			  | 106        | REJECT   | UNKWNERROR |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S3.12 - Verify failure - UNKWNERROR
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template verifyRequest-template.xml and values
		|  token   			| messageId | wsuId | wsse.username | wsse.password  |
		|  1234123412341122 | msgId  	| someId | myUser    	| myPwd          |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message 		|
		| 106 			| UNKWNERROR    |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccVerifyService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			  | 106        | REJECT   | UNKWNERROR |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S3.13 - Verify failure - - NOACCESS
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template verifyRequest-template.xml and values
		|  token   			| messageId | wsuId | wsse.username | wsse.password  |
		|  1234123412341122 | msgId  	| someId | myUser    	| myPwd          |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message 	|
		| 200 			| NOACCESS  |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccVerifyService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			  | 200        | REJECT   | NOACCESS |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S3.13 - Verify failure - - NOSERVICE
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template verifyRequest-template.xml and values
		|  token   			| messageId | wsuId | wsse.username | wsse.password  |
		|  1234123412341122 | msgId  	| someId | myUser    	| myPwd          |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message 	|
		| 201 			| NOSERVICE  |
	And the request is stubbed to return 201
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccVerifyService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			  | 201        | REJECT   | NOSERVICE |
#------------------------------------------------------------------------------------------------------------------------
