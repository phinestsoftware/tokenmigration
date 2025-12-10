#   ====================================================================================================================
Feature: Feature T1 -Moneris tokenization
#   ====================================================================================================================
#------------------------------------------------------------------------------------------------------------------------
Scenario: S1.1 - tokenization success
#------------------------------------------------------------------------------------------------------------------------
#request - @wsuId, @wsse.username, @wsse.password, @accountNumber, @cardType={V,M,D,A}
Given The application target vault is set to Moneris
And   request uses template tokenizationRequest-template.xml and values
	|  accountNumber   | cardType | expirationYear | expirationMonth | wsuId | wsse.username | wsse.password  |
	|  1234123412341122 | V  		|    2020         |  10              | someId | myUser    	 | myPwd      |
And   response uses template Moneris-tokenizationResponse-template.xml and values
	|  dataKey           | responseCode | responseFlag	| message | cardType |
	|  0000000000001122  | 100 			| ACCEPT 	    | OK  	  | V        |
And the request is stubbed to return 200
When  dispatch endpoint is called with templated request
Then  The response code is 200
And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
	| ccTokenizeService.run | vault.token      | reasonCode | rm.rflag | rm.rmsg |
	| true        			| 0000000000001122 | 100        | ACCEPT   | OK   	 |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S1.1.1 - tokenization success - MaskedPan in response
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template tokenizationRequest-template.xml and values
		|  accountNumber   | cardType | expirationYear | expirationMonth | wsuId | wsse.username | wsse.password  |
		|  1234123412341122 | V  		|    2020         |  10              | someId | myUser    	 | myPwd      |
	And   response uses template Moneris-tokenizationResponse-extraProperty-template.xml and values
		|  dataKey           | responseCode | responseFlag	| message | cardType | extraProperty 				|
		|  0000000000001122  | 100 			| ACCEPT 	    | OK  	  | V        | <MaskedPan>***</MaskedPan>   |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccTokenizeService.run | vault.token      | reasonCode | rm.rflag | rm.rmsg |
		| true        			| 0000000000001122 | 100        | ACCEPT   | OK   	 |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S1.2 - tokenization failure - missing Required field PAN
#------------------------------------------------------------------------------------------------------------------------
Given The application target vault is set to Moneris
And   request uses file tokenizationRequest-accNoMissing.xml
And the request is stubbed to return 200
When  dispatch endpoint is called with templated request
Then  The response code is 200
And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
	| ccTokenizeService.run| reasonCode | rm.rflag |
	| true        		    | 102       | REJECT   |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S1.3 - tokenization failure - missing Required field CARD TYPE
#------------------------------------------------------------------------------------------------------------------------
Given The application target vault is set to Moneris
And   request uses file tokenizationRequest-cardTypeMissing.xml
And the request is stubbed to return 200
When  dispatch endpoint is called with templated request
Then  The response code is 200
And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
	| reasonCode | rm.rflag |
	| 103        | REJECT   |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S1.3.1 - tokenization failure - invalid field CARD TYPE
#------------------------------------------------------------------------------------------------------------------------
Given The application target vault is set to Moneris
	And   request uses template tokenizationRequest-template.xml and values
		|  accountNumber   | cardType | expirationYear | expirationMonth | wsuId | wsse.username | wsse.password  |
		|  1234123412341122 | X  		|    2020         |  10              | someId | myUser    	 | myPwd      |
And the request is stubbed to return 200
When  dispatch endpoint is called with templated request
Then  The response code is 200
And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
	| reasonCode | rm.rflag |
	| 103        | REJECT   |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S1.50 - tokenization failure - invalid operation  - SOAP fault
#------------------------------------------------------------------------------------------------------------------------
Given The application target vault is set to Moneris
And   request uses file tokenizationRequest-invalidOp.xml
And the request is stubbed to return 200
When  dispatch endpoint is called with templated request
Then  The response code is 200
And  The response body contains for path $.env:Envelope.env:Body.env:Fault an object which looks like
	| faultcode  |
	| env:Client |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S1.10 - tokenization failure - null responseCode
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template tokenizationRequest-template.xml and values
		|  accountNumber   | cardType | expirationYear | expirationMonth | wsuId | wsse.username | wsse.password  |
		|  1234123412341122 | V  		|    2020         |  10              | someId | myUser    	 | myPwd      |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message |
		| null 			| OK      |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccTokenizeService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			| 106        | REJECT   | UNKWNERROR |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S1.11 - tokenization failure - null responseMessage
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template tokenizationRequest-template.xml and values
		|  accountNumber   | cardType | expirationYear | expirationMonth | wsuId | wsse.username | wsse.password  |
		|  1234123412341122 | V  		|    2020         |  10              | someId | myUser    	 | myPwd      |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message |
		| 100 			| null    |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccTokenizeService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			| 106        | REJECT   | UNKWNERROR |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S1.12 - tokenization failure - UNKWNERROR
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template tokenizationRequest-template.xml and values
		|  accountNumber   | cardType | expirationYear | expirationMonth | wsuId | wsse.username | wsse.password  |
		|  1234123412341122 | V  		|    2020         |  10              | someId | myUser    	 | myPwd      |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message 		|
		| 106 			| UNKWNERROR    |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccTokenizeService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			| 106        | REJECT   | UNKWNERROR |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S1.12.1 - tokenization failure - BADTYPE
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template tokenizationRequest-template.xml and values
		|  accountNumber   | cardType | expirationYear | expirationMonth | wsuId | wsse.username | wsse.password  |
		|  1234123412341122 | V  		|    2020         |  10              | someId | myUser    	 | myPwd      |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message    |
		| 103 			| BADTYPE    |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccTokenizeService.run | reasonCode | rm.rflag | rm.rmsg |
		| true        			| 103        | REJECT   | BADTYPE |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S1.12.2 - tokenization success - unrecognized property in response
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template tokenizationRequest-template.xml and values
		|  accountNumber   | cardType | expirationYear | expirationMonth | wsuId | wsse.username | wsse.password  |
		|  1234123412341122 | V  		|    2020         |  10              | someId | myUser    	 | myPwd      |
	And   response uses template Moneris-tokenizationResponse-extraProperty-template.xml and values
		|  dataKey           | responseCode | responseFlag	| message | cardType | extraProperty 					 |
		|  0000000000001122  | 100 			| ACCEPT 	    | OK  	  | V        | <SomeProperty>ABC</SomeProperty>  |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.env:Fault an object which looks like
		| faultcode  |
		| env:Receiver |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S1.13 - tokenization failure - NOACCESS
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template tokenizationRequest-template.xml and values
		|  accountNumber   | cardType | expirationYear | expirationMonth | wsuId | wsse.username | wsse.password  |
		|  1234123412341122 | V  		|    2020         |  10              | someId | myUser    	 | myPwd      |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message 	|
		| 200 			| NOACCESS  |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccTokenizeService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			| 200        | REJECT   | NOACCESS |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S1.14 - tokenization failure - NOSERVICE
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template tokenizationRequest-template.xml and values
		|  accountNumber   | cardType | expirationYear | expirationMonth | wsuId | wsse.username | wsse.password  |
		|  1234123412341122 | V  		|    2020         |  10              | someId | myUser    	 | myPwd      |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message 	|
		| 201 			| NOSERVICE  |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccTokenizeService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			| 201        | REJECT   | NOSERVICE |
#------------------------------------------------------------------------------------------------------------------------
