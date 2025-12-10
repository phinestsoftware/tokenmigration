#   ====================================================================================================================
Feature: Feature T4 -Moneris First6
#   ====================================================================================================================
#------------------------------------------------------------------------------------------------------------------------
Scenario: S4.1 - First6 success
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template firstSixRequest-template.xml and values
		|  token   			| wsuId  | wsse.username | wsse.password	| messageId          |
		|  0001000200030004 | someId | myUser    	 | myPwd     	   	| UUID-CIP-generated |
	And   response uses template Moneris-lookupMaskedResponse-template.xml and values
		|  dataKey           | responseCode	| responseFlag	| message | cardType | maskedPan |
		|  0000000000001122  | 100 			| ACCEPT 	    | OK  	  | V        | 123456    |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccFirstSixService.run | vault.cardFirstSix | reasonCode | rm.rflag | rm.rmsg |
		| true             	    | 123456    		 | 100        | ACCEPT   | OK      |
#------------------------------------------------------------------------------------------------------------------------
	Scenario: S4.2 - First6 failure - missing Required field token
#------------------------------------------------------------------------------------------------------------------------
		Given The application target vault is set to Moneris
		And   request uses file firstSixRequest-accNoMissing.xml
		And the request is stubbed to return 200
		When  dispatch endpoint is called with templated request
		Then  The response code is 200
		And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccFirstSixService.run	| reasonCode | rm.rflag |
		| true             	   	| 101        | REJECT   |
#------------------------------------------------------------------------------------------------------------------------
	Scenario: S4.3 - First6 failure - missing section 'card' - Soap fault
#------------------------------------------------------------------------------------------------------------------------
		Given The application target vault is set to Moneris
		And   request uses file firstSixRequest-noCardTag.xml
		And the request is stubbed to return 200
		When  dispatch endpoint is called with templated request
		Then  The response code is 200
		And  The response body contains for path $.env:Envelope.env:Body.env:Fault an object which looks like
		| faultcode	 | faultstring |
		| env:Client | cvc-complex-type.2.4.b: The content of element 'requestMessage' is not complete. One of '{card, user, ccTokenizeService, ccDeTokenizeService, ccVerifyService}' is expected. |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S4.13 - First6 failure - NOACCESS
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template firstSixRequest-template.xml and values
		|  token   			| wsuId  | wsse.username | wsse.password	| messageId          |
		|  0001000200030004 | someId | myUser    	 | myPwd     	   	| UUID-CIP-generated |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message 	|
		| 200 			| NOACCESS  |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccFirstSixService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			| 200        | REJECT   | NOACCESS |
#------------------------------------------------------------------------------------------------------------------------
Scenario: S4.14 - First6 failure - NOSERVICE
#------------------------------------------------------------------------------------------------------------------------
	Given The application target vault is set to Moneris
	And   request uses template firstSixRequest-template.xml and values
		|  token   			| wsuId  | wsse.username | wsse.password	| messageId          |
		|  0001000200030004 | someId | myUser    	 | myPwd     	   	| UUID-CIP-generated |
	And   response uses template Moneris-response-failure.xml and values
		| responseCode	| message 	|
		| 201 			| NOSERVICE  |
	And the request is stubbed to return 200
	When  dispatch endpoint is called with templated request
	Then  The response code is 200
	And  The response body contains for path $.env:Envelope.env:Body.urn:responseMessages.responseMessage an object which looks like
		| ccFirstSixService.run | reasonCode | rm.rflag | rm.rmsg 	 |
		| true        			| 201        | REJECT   | NOSERVICE |
#------------------------------------------------------------------------------------------------------------------------

