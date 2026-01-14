# **Detailed Design Document for Project Payment Modernization \- Token Migration**

| Project ID | RP-75663  |
| :---: | :---- |
| **Project Name** | Payment Modernization |
| **Package Number** | [RPP-6758](https://reqcentral.com/browse/RPP-6758) |
| **Package Name** | [\[RP-75663\] (2) Payment Modernization \- Token Migration](https://reqcentral.com/browse/RPP-6758) |

# **Document Info**

| Project Delivery Owner | Greg McNairn |
| :---: | :---- |
| **Solution Delivery Manager** | Vladimir Igumnov |
| **Lead Architect / Lead Integrator** | Rekha Nanaware, Farheen Syed |
| **IT Project Manager** | Tariq Naseem |

## **Project Assessment**

|  | Date Assessed | Result |
| :---- | ----- | ----- |
| **Project Complexity** |  |  |
| **Security Risk Ranking** |  |  |

***The information contained is confidential and proprietary to Rogers Communications Inc. and may not be used, reproduced or disclosed to others except as specifically permitted in writing by a Senior Officer of Rogers Communications Inc. By receiving and using this information, you agree to protect the same from loss, theft, unauthorized use and dissemination on behalf of Rogers Communications Inc., and to report any such loss, theft or unauthorized use in writing to the General Counsel of Rogers Communications Inc. so that appropriate legal action can be taken.***

**Providing Sign-off for Detailed Design Document (DDD)**

Sign-off on any SDLC deliverable indicates that you confirm that your team’s contributions have been completed to the quality standards/practices expected for your functional area and are in alignment with the expectations for the assigned project role. In addition, sign-off includes:

* Accountability for reviewing the contribution of others  
* Validation of assumptions  
* Confirmation of ownership for dependencies, pending issues or for risk response plans, which are included in the document

Sign-off indicates that that any issues or risks have been (or will be) addressed prior to the solution going into production.

**Procuring Sign-off for Detailed Design Document (DDD)**

Please refer to the guidelines for “[Artifact Submission & Sign-off](https://rcirogers.sharepoint.com/sites/ITS-Projects/Guidlines_Wiki/Pages/Artifact%20Submission%20and%20Sign-off.aspx)” information.

“Important Note: *This artifact must be submitted to stakeholder approval via a Jira DDD ticket and not via email* (See [How to Create a DDD Artifact ticket](https://reqcentral.com/wiki/display/JPP2T/How+to+Create+a+DDD+Artifact+ticket) for details). Embedded approval emails are not acceptable. *CoE reserves the right to reject this artifact* if it has been approved via email and there is enough grounds for CoE to understand proper approval process via Jira could have been followed..

 

| Project Role | Application(s) Impacted | Functional Prime |
| ----- | ----- | ----- |
| **1.1 IT Functional Primes** |  |  |
|   	Project Manager |  |  |
|   	Solution Delivery Manager |  |  |
|   	Architect |  |  |
|   	Lead BSA |  |  |
|  	Technical Lead, Integration |  |  |
|  	Corporate Information Security |  |  |
|  	Infrastructure |  |  |
| *Insert rows to add application development primes* |  |  |
| 	Catalog/Config Management |  |  |
|  	Data Management Team (DMT) |  |  |
|  	NPE (Non-Production Environment) |  |  |
| 	QA – Integration Testing (INT) |  |  |
| 	QA – System Functional Testing (SFT) |  |  |
|    Solution Acceptance Prime |  |  |
| **Project Role** | **Application(s) Impacted** | **Functional Prime** |
| 	Performance Testing |  |  |
| 	Enterprise Application Monitoring |  |  |
|  	Production Support Lead |  |  |
| *Insert rows to add production support primes* |  |  |
| 	Vendor |  |  |
| **1.2  Business Primes** |  |  |
|  	Customer Experience Testing (CET) |  |  |
| **1.3 Network Stakeholders** |   |   |
| *Insert rows to add network stakeholders* |   |   |

 

## **Document Version History**

| Date | Version | Description | Name |
| ----- | ----- | ----- | ----- |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

## **Change Request Log**

*If a Document-type change, under Description, specify the Section/Sub-section.*

| Date | Change Request \# | Description | Name |
| ----- | ----- | ----- | ----- |
|  |  |  |  |
|  |  |  |  |

## **Document Owner**

*The primary contact for questions regarding this document is:* 

| Name | Title | Email | Phone |
| ----- | ----- | ----- | ----- |
|  |  |  |  |

## **Contributors**

| Name | Title | Email | Phone |
| ----- | ----- | ----- | ----- |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

## **Referenced Documents**

Provide links and version dates to the additional documents listed below

| Document | Link | Date | Version |
| ----- | ----- | ----- | ----- |
| Requirements Matrix (RM) | *\<\<Embedded Document\>\>* |  |  |
| CyberSTARR | *\<\<Embedded Document\>\>* |  |  |

***The information contained is confidential and proprietary to Rogers Communications Inc. and may not be used, reproduced or disclosed to others except as specifically permitted in writing by a Senior Officer of Rogers Communications Inc. By receiving and using this information, you agree to protect the same from loss, theft, unauthorized use and dissemination on behalf of Rogers Communications Inc., and to report any such loss, theft or unauthorized use in writing to the General Counsel of Rogers Communications Inc. so that appropriate legal action can be taken.*** 

# **Table of Contents**

**Error rendering macro 'toc'**

null

# **Introduction**

All instructions are written in *Blue, Italics* font and between \<\<   \>\> brackets:

* Replace this text with the appropriate information and diagrams to document the solution specifications  
* Remove all *Blue Italics* font

 

*\<\<Describe the component of the software product whose detailed design is being described in this document.\>\>*

## **Scope (Specify both in scope and out of scope items)**

## **Assumptions**

| Assumptions |
| ----- |
| More error scenarios will be added in development phase |
| More qualification criteria for tokens will be added in development phase |
| Logic to identify cohort id is finalized in development phase |
| More configuration options will be added in development phase |

## **Constraints**

## **Reference Documents (Specify HLD, Requirements Matrix)**

## **Explanation of Terms/Abbreviations**

# **Current State Architecture Diagram**

*\<\<Link to section 7.1 (Solution Architecture-Current State) of HLD\>\>*

# **Target State Architecture Diagram**

*\<\<Link to HLD section 7.2 (Solution Architecture \-Target State)\>\>*

# **Process Flow**

This section can be used to explain the processing logic within a component or across multiple components. If this is a small enhancement project then this section can be used to describe the changes being done to a component.

*The following describes different ways to document this content*

* *Sequence and collaboration diagrams can be used in an OO model*

 	***\<\<Refer to Appendix A for a sample AND/OR\>\>***

* A diagram representing the decomposition of the component can be used where smaller components are connected using numbered arrows to describe the flow of data. A description of the flow should also be provided.

                 ***\<\<Refer to Appendix B for a sample\>\>***

# **Component Structure and Interfaces \- Payment HUB**

This section may be expanded to support multiple modules and/or components of the solution. The following defines different ways to document this section

* A diagram representing the break down / decomposition of the subcomponent whose detailed design is being described in this document. Smaller components can be connected using arrows to describe the interface between the components and in some cases to describe the flow of data. This can be followed by a brief description of each of the components.

***Refer to Appendix C for a sample*** **AND/OR**

* In the OO model this section can contain class diagrams, Complement the class diagram with a description of each class.

***Refer to Appendix D for a sample*** **AND/OR**

* If the scope of this document is to describe the design of a GUI component depending on the design pattern utilized, a block diagram can be used to represent the different components:

***Refer to Appendix E for a sample***

 

 

 

ESM \-

Web \- Create and generate token

Create table with all active credit cards

EFT \- 

 

 

## **Multiple Modules and/or Components**

### **Interface Information – Mandatory**

|   | Interface Type: Webservice message queue JMS Message queue MQ P2P Batch file | Changed from Drop 1/2 | No Change | New for drop 3 | If Changed, please list change(i.e. Operation added, new field) |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **List Interfaces:** |   |   |   |   |   |
|   |   |   |   |   |   |

 

 

| For Web Service Interface: | End Point | Development Owner | Solution Architect |
| ----- | ----- | ----- | ----- |
|   |   |   |   |
|   |   |   |   |
| **For Message Queues** | **Queue Name** | **Development Owner** | **Solution Architect** |
|   |   |   |   |
|   |   |   |   |
| **For Batch Files** | **Location(Relative Path)** | **Development Owner** | **Solution Architect** |
|   |   |   |   |
|   |   |   |   |
| **Verification** | **Rogers Approver Name** | **EIF Approver Name** | **Amdocs Approver Name** |
| **For Web Services, Verify Number of Operations match corresponding dependent application** |   |   |   |
| **For Queues, Verify Number of request/response queues match corresponding dependent application** |   |   |   |

 

### **Presentation Tier**

Rich Client

Thin Client

### **Messaging / Interface Tier (Mandatory)**

Tier provides the interface between the presentation/client tier and the middle tier. The primary focus of this tier is on the technology that can be used for connecting the presentation/client tier with the business logic and on the design of the message/data that need to be exchanged between the presentation/client tier and middle tier.

#### **Payment Hub \- Token Management Microservice**

### **Orchestration/Transformation Tier (Mandatory)**

Tier provides facility to aggregate/orchestrate the functionalities and data provided by existing business components. This tier enables cross-LOB and cross-product functionality.

### **Business Logic Tier (Mandatory)**

New and/or updated business logic is deployed within this tier. Tier communicated to the database and/or the legacy systems through the data access and/or adapter tier.

 

#### **Sequence Diagrams**

##### **Mass Migration**

**![][image1]**

 

##### **Delta Migration**

**![][image2]**

 

##### **Realtime tokenization**

**![][image3]**

##### **Token Management MS \- GetPGToken \- \> Use case 1: Get PG token from DB**

**![][image4]**

##### **Token Management MS \- GetPGToken \- \> Use case 2: Get PG token from RTMM**

**![][image5]**

 

##### **PG Tokenization MS \-\> Use case 1:  Realtime Token Conversion**

**![][image6]**

##### **PG Tokenization MS \-\> Use case 2:  Batch Token Conversion**

**![][image7]**

 

#### **API Details**

##### **Token Management MS \- GetPGToken**

Attached document has following details

1\. Token Management MS \- GetPGToken  
 1.1. Use case 1: Get PG token from DB  
 1.2. Use case 2: Get PG token from RTMM  
 1.3. Integration Details  
 1.4. Headers  
 1.5. Request Parameters Input  
 1.6. Input Validation  
 1.7. Response Parameters  
 1.8. Get PG Token API Logic  
 4.1. Error Codes

![][image8]

Technology Stack

·        

* Runtime: Springboot on AKS  
  * Language: Java  
  * Platform: AKS  
  * Database: Azure SQL Database  
  * Monitoring: Azure Application Insights, Dynatrace

##### **RTMM (Realtime mapping ms) APIs**

Attached document has following details

1\. PG Tokenization MS  
 1.1. Use case 1:  Realtime Token Conversion  
 1.2. Use case 2:  Batch Token Conversion  
 1.3. API 1: createPgtoken  
 1.3.1. Integration Details  
 1.3.2. Headers  
 1.3.3. Request Parameters Input (GetPGToken\_Req)  
 1.3.4. Input Validation  
 1.3.5. Response Parameters (GetPGToken\_Res )  
 1.3.6. Create PG Token API Logic  
 1.3.7. Error Codes  
 1.4. API2: Submit Batch  
 1.4.1. Integration Details  
 1.4.2. Headers  
 1.4.3. Request Parameters Input  
 1.4.4. Input Validation  
 1.4.5. Response Parameters  
 1.4.6. Submit Batch API Logic  
 1.4.7. Error Codes  
 1.5. API3: Get Batch Status  
 1.5.1. Integration Details  
 1.5.2. Headers  
 1.5.3. Request Parameters Input  
 1.5.4. Input Validation  
 1.5.5. Response Parameters  
 1.5.6. Get Batch Status API Logic  
 1.5.7. Error Codes  
 1.6. API4: Get Batch Result  
 1.6.1. Integration Details  
 1.6.2. Headers  
 1.6.3. Request Parameters Input  
 1.6.4. Input Validation  
 1.6.5. Response Parameters  
 1.6.6. Get Batch Result API Logic  
 1.6.7. Error Codes  
 2\. PG Dispatcher MS  
 2.1. API 1: createPgtoken  
 2.1.1. Integration Details  
 2.1.2. Headers  
 2.1.3. Request Parameters Input (GetPGToken\_Req)  
 2.1.4. Input Validation  
 2.1.5. Response Parameters (GetPGToken\_Res )  
 2.1.6. Create PG Token API Logic  
 2.1.7. Error Codes  
 2.2. API2: Submit Batch  
 2.2.1. Integration Details  
 2.2.2. Headers  
 2.2.3. Request Parameters Input  
 2.2.4. Input Validation  
 2.2.5. Response Parameters  
 2.2.6. Submit Batch API Logic  
 2.2.7. Error Codes  
 2.3. API3: Get Batch Status  
 2.3.1. Integration Details  
 2.3.2. Headers  
 2.3.3. Request Parameters Input  
 2.3.4. Input Validation  
 2.3.5. Response Parameters  
 2.3.6. Get Batch Status API Logic  
 2.3.7. Error Codes  
 2.4. API4: Get Batch Result  
 2.4.1. Integration Details  
 2.4.2. Headers  
 2.4.3. Request Parameters Input  
 2.4.4. Input Validation  
 2.4.5. Response Parameters  
 2.4.6. Get Batch Result API Logic  
 2.4.7. Error Codes

![][image9]

Technology Stack

·        

* Runtime: SpringBoot with Tomcat on CDE VM  
  * Language: Java  
  * Monitoring: TBD

### **Adapter**

Tier provides connectivity to the existing host systems and/or the database

### **Host Interface Tier (Mandatory)**

This tier is where the host ends of the connectors and/or interfaces are constructed. These components are required to complete the translation from the external format to the host specific formats.

### **Host/Database Tier**

Tier where the database and/or the existing systems reside. These systems may support a specific product and/or specific functionality.

### **Validation Logic**

This component implements the details of the validation/edit checks that need to be performed on different tiers. Specifically, it should address:

* Location of edit checks and validations. Presentation, Mid-Tier, both?  
* Types of checks that will be performed  
* Generic methods and/or design to perform the edits

## **Data Services**

The intent of this section is to describe methods for managing the data within the database and how they interact. 

Data Services included within the scope of this document are based on architectural direction / recommendations. 

### **Business Tier Adapter Services – Data *(Mandatory)***

Common Data Services that support data access and management of data within the respective data base management systems. At a minimum, the services support the standard CRUD Matrix (Create, Read, Update and Delete).  Typically these services are implemented through the use of database objects, such as stored procedures.

### **Business Tier Adapter Services – Messaging *(Mandatory)***

Messaging Services that support the exchange of information are defined based on architectural direction / recommendations. XML schemas require validation against persistent data standards and guidelines for data type consistency. I.e., Message definitions need to be defined in the context of a rationalized business function.

### **Database Services** 

Database Specific that supports data access and management of data within the respective data base management systems. At a minimum, the services support the standard CRUD Matrix (Create, Read, Update and Delete).

Data Services included within the scope of this document are based on architectural direction / recommendations.

#### **DDL**

**![][image10]**

## **ETL/Data Mapping**

Clearly highlight any data mapping requirements. Mappings can include both ETL and data migration requirements.

 

### **Payment Hub \- Migration Microservice**

           The Payment Hub Migration Microservice is a serverless solution built on Azure Functions that manages the mass migration of payment tokens from Moneris to Mastercard Payment Gateway.

           The system processes token files from billing systems, validates tokens, coordinates with Mastercard for token conversion, and updates the Payment Hub with new tokenized payment methods.

           

#### **Summary of flow**

##### **Migration tables source to target Mapping**

**![][image11]**

##### **Azure Function to target Mapping flow**

**![][image12]**

##### **Sample Wave 1 Execution Flow-With sample data**

**![][image13]**

##### **Input-Output\_File\_Format**

**![][image14]**

##### **Input-Output\_File\_Location**

Following file locations are tentative and can change in development phase.

**Mass Migration**

| File Type | Location |
| ----- | ----- |
| File from Billing systems (Moneris token location) | WinOnline Media (PHUB/INBOX/**MASSMIG**/**WINM**/ENC)  V21 (PHUB/INBOX/**MASSMIG**/**V21**/ENC)  TSC (PHUB/INBOX/**MASSMIG**/**TSC**/ENC) |
| File generated for mastercard | PG/OUTBOX/MASSMIG/ENC |
| File received from mastercard | PG/INBOX/MASSMIG/ENC |
| File generated for billing systems | WinOnline Media (PHUB/OUTBOX/MASSMIG/WINM/ENC\_SUCCESS , PHUB/OUTBOX/**MASSMIG**/**WINM**/ENC\_ERROR) V21 (PHUB/OUTBOX/**MASSMIG**/**V21**/ENC\_SUCCESS , PHUB/OUTBOX/**MASSMIG**/**V21**/ENC\_ERROR) TSC (PHUB/OUTBOX/**MASSMIG**/**TSC**/ENC\_SUCCESS , PHUB/OUTBOX/**MASSMIG**/**TSC**/ENC\_ERROR ) |

**Delta Migration**

| File Type | Location |
| ----- | ----- |
| File from Billing systems (Moneris token location) | WinOnline Media (PHUB/INBOX/**DELTA**/**WINM**/ENC)  V21 (PHUB/INBOX/**DELTA**/**V21**/ENC)  TSC (PHUB/INBOX/**DELTA**/**TSC**/ENC) |
| File generated for billing systems | WinOnline Media (PHUB/OUTBOX/**DELTA**/WINM/ENC\_SUCCESS , PHUB/OUTBOX/**DELTA**/**WINM**/ENC\_ERROR) V21 (PHUB/OUTBOX/**DELTA**/**V21**/ENC\_SUCCESS , PHUB/OUTBOX/**DELTA**/**V21**/ENC\_ERROR) TSC (PHUB/OUTBOX/**DELTA**/**TSC**/ENC\_SUCCESS , PHUB/OUTBOX/**DELTA**/**TSC**/ENC\_ERROR ) |

##### **Sample Runbook**

**![][image15]**

#### **Azure Functions**

Following azure functions will be used to orchestrate mass migration and delta migration

| Function name | Mode | Description of Changes/ Comments |
| :---- | :---- | :---- |
| Token File Processor | Upload File | 1\.       1\.       1\.     Triggered from blob storage 1\.     Moneris location (billing/input) 1\.     WinOnline Media (billing/input/winmedia) 2\.     V21 (billing/input/v21) 3\.     TSC (billing/input/tsc) 2\.     Master card location (mastercard/mapping) 2\.     Identify context 3\.     Send email \- start of process. 4\.     Decrypt file in cases its required. Configuration will be defined in detailed design document.  5\.     validate and load file content (validation rules mentioned in DDD) 1\.      Moneris token will be uploaded to  MONERIS\_TOKENS\_STAGING 2\.      Master card token will be uploaded to  PG\_TOKENS\_STAGING 6\.     Reject file if file can not be read or loaded and send email 7\.     Assign File id to the uploaded tokens and insert record to : TOKEN\_MIGRATION\_BATCH. File formats mentioned in [Input file format](https://reqcentral.com/wiki/spaces/PAYMOD/pages/970097561/Detailed+Design+Document+for+Project+Payment+Modernization+-+Token+Migration) section |
| Token File Processor | Validate Tokens | 1\.       1\.       1\.     identify context (Moneris vs PG by corresponding file id) from TOKEN\_MIGRATION\_BATCH 2\.     Validate tokens content by file id (validation rules mentioned in DDD) 1\.     Moneris tokens →  MONERIS\_TOKENS\_STAGING 2\.     Master card token → PG\_TOKENS\_STAGING 3\.     Look up in payment hub DB 1\.     Moneris (detailed design will add/remove tables) 1\.     PMR\_MONERIS\_MAPPING 2\.     ENTITY\_PMR\_MAPPING 2\.     Master card (detailed design will add/remove tables) 1\.     PAYMENT\_METHOD 2\.     TOKENIZED\_CARD 3\.     ENTITY\_PMR\_MAPPING 4\.      Validate tokens relation to payment hub details (validation rules mentioned in DDD) and update migration status on MONERIS\_TOKENS\_STAGING, PG\_TOKENS\_STAGING per token. 1\.     if more than 50% (configurable) failure, reject the file (update TOKEN\_MIGRATION\_BATCH, MIGRATION\_ERROR DETAILS) and send the failure email.  2\.     On success  update TOKEN\_MIGRATION\_BATCH. 5\.     Based on successfully validated token count, create batch metadata and update TOKEN\_MIGRATION\_BATCH 1\.     Batch size (to be used by token processor manager), total batches, wait time, retry time etc.  |
| Token File Processor | Create Batch | 1\.       1\.       1\.     Based on successfully validated token count, create batch metadata and update TOKEN\_MIGRATION\_BATCH 1\.     Batch size (to be used by token processor manager), total batches, wait time, retry time etc.  2\.     Max batch size, other metadata will be configurable per billing system and can be changed by production support team (reference table name to be finalized in DDD)  Note: This will be needed when token migration status is updated manually and rerun is needed on migration. |
| Token Processor | fileGen | 1\.       1\.       1\.     Based on migration status in : MONERIS\_TOKENS\_STAGING, create input file for master card 1\.     File will be combined for multiple inputs when needed. This will be handled by cohort id which include multiple input file IDs. 2\.     Files will be encrypted  based on configuration per target system. 2\.     File format defined in [Master card input file format](https://reqcentral.com/wiki/spaces/PAYMOD/pages/955828204/High+Level+Design+Document+for+Payment+Modernization+Token+Migration#HighLevelDesignDocumentforPaymentModernizationTokenMigration-Mastercardinputfileformat) 3\.     Store generated file to Azure Blob storage → mastercard/input  4\.     update TOKEN\_MIGRATION\_BATCH |
| Token Processor | BatchManager | 1\.       1\.       1\.     Take input as file id 2\.     Retrieve batch metadata from : TOKEN\_MIGRATION\_BATCH 3\.     Based on context and batch size, assign batch id to MONERIS\_TOKENS\_STAGING or PG\_TOKENS\_STAGING 4\.     create new entry in TOKEN\_MIGRATION\_BATCH (unique batch name, file id, token count, migration type (mass or delta) context (Moneris or PG) along with stats and status ) 5\.     Initiate Token Processor (mode : worker) with newly created batch id 6\.     go to step 3 for next batch creation.  7\.     update TOKEN\_MIGRATION\_WORKERS 8\.     Repeat these steps till all tokens are assigned to a batch or .max active workers reached |
| Token Processor | BatchWorker | 1\.       1\.       1\.     Take input batch id,  2\.     Retrieve batch metadata from : TOKEN\_MIGRATION\_BATCH 3\.     Based on context and batch id retrieve tokens MONERIS\_TOKENS\_STAGING or PG\_TOKENS\_STAGING 4\.     if mass migration proceed to payment hub update (**step 7**) 5\.     if delta migration (context \= Moneris ) and batch is **not** submitted 1\.     retrieve tokens from MONERIS\_TOKENS\_STAGING 2\.     create batch request for PGTokenizer 3\.     submit batch request to PGTokenizer through SSG 4\.     Submit Azure Function timer to check for batch status 6\.     if delta migration (context \= Moneris ) and batch is **submitted** 1\.     Check batch status 2\.     if batch status is **"Complete"** 1\.     invoke Get Batch Result 2\.     if Batch metadata says full delta migration, 1\.     store batch result to Azure Blob storage → mastercard/input using file format :  [Master card input file format](https://reqcentral.com/wiki/spaces/PAYMOD/pages/955828204/High+Level+Design+Document+for+Payment+Modernization+Token+Migration#HighLevelDesignDocumentforPaymentModernizationTokenMigration-Mastercardinputfileformat) 3\.     if Batch metadata says "throttled delta migration" 1\.     Store batch result to PG\_TOKENS\_STAGING 2\.     Reuse code of "Token File Processor: Validate Tokens". 3\.     update TOKEN\_MIGRATION\_BATCH with stats 4\.     On successful validation proceed to payment hub update (**step 7**) 3\.     Else if batch status is **not** "Complete" 1\.     Submit Azure Function timer to check for batch status 7\.     Update Payment Hub  DB 1\.     PAYMENT\_METHOD 2\.     TOKENIZED\_CARD 3\.     ENTITY\_DETAILS (Entity may exists but PMR mapping may not exist, do not update for id migration and transaction history migration) 4\.     ENTITY\_PMR\_MAPPING 5\.     PMR\_MONERIS\_MAPPING  6\.     TOKEN\_ACTIVITY\_LOG (if existing token attributes is changed) 8\.     PM\_UPDATED\_CHANNEL should be updated when a channel send same moneris token which already exists. 9\.     update migration status on MONERIS\_TOKENS\_STAGING, PG\_TOKENS\_STAGING per token. 10\.  update TOKEN\_MIGRATION\_BATCH with stats |
| Audit and Control |   | 1\.       1\.       1\.     Scan TOKEN\_MIGRATION\_BATCH, MONERIS\_TOKENS\_STAGING, PG\_TOKENS\_STAGING  and identify if retry is need (retry rules to be defined in DDD) 2\.     Once all batches are complete  (failed batches and failed tokens are OK, batch status or token status should not PENDING) 1\.     check configuration if response file for billing should be generated as part of bulk/delta migration for specific Billing System. 1\.     If yes: invoke "Generate Billing Mapping File" 2\.     Send Notification email taking stats from TOKEN\_MIGRATION\_BATCH, MONERIS\_TOKENS\_STAGING, PG\_TOKENS\_STAGING  |
| Generate Billing Mapping File |   | 1\.       1\.       1\.     Following input will be taken in this function 1\.     Billing System (Source ID) 2\.     Migration Start Date and Migration End Date. (Optional). 3\.     File ID  (Optional) 4\.     Batch ID (Optional) 2\.     Identify tokens from MONERIS\_TOKENS\_STAGING (exact criteria to be finalized in DDD) 3\.     Based on migration status in MONERIS\_TOKENS\_STAGING, Generate out file to with successful tokens and failure tokens in billing/output (Use data from PMR\_MONERIS\_MAPPING, TOKENIZED\_CARD, ENTITY\_PMR\_MAPPING) 1\.      WinOnline Media (billing/output/winmedia/success , billing/output/winmedia/failure) 2\.     V21 (billing/output/v21/success, billing/output/v21/failure) 3\.     TSC (billing/output/tsc/success,billing/output/tsc/failure ) 4\.     File will be encrypted based on configuration (if encryption is needed.) Default value will be always encrypt and it will need deployment change this setting so that configuration will go through change management process. 5\.     Based on input, only one file will be created irrespective of number of input files. 6\.     File format is defined in [Response file format to Billing systems](https://reqcentral.com/wiki/spaces/PAYMOD/pages/955828204/High+Level+Design+Document+for+Payment+Modernization+Token+Migration#HighLevelDesignDocumentforPaymentModernizationTokenMigration-ResponsefileformattoBillingsystems).  7\.     Update MONERIS\_TOKENS\_STAGING with extract details if needed (update rules to be finalized in DDD) 8\.     insert new record in TOKEN\_MIGRATION\_BATCH with stats. |
| Post Migration Task   | Update Issuer   | Update values where source and target both are phub database ·         o     §    §    §  Update Issuer name in TOKENIZED\_CARD table  §  Only update  tokens with final status COMPLETED (or per defined rules in detailed design). |

**Technology Stack**

·        

* Runtime: Node.js 20 LTS  
  * Language: TypeScript  
  * Platform: Azure Functions v4  
  * Database: Azure SQL Database  
  * Storage: Azure Blob Storage  
  * Messaging: Azure Storage Queues  
  * Monitoring: Azure Application Insights, Dynatrace

Following Azure functions will be created.

##### **Token File Processor (blob-trigger) \- (Azure Function)**

Purpose

Central entry point for **all token-related files** (Moneris full/delta token files and Mastercard response mapping files).  
 It validates, decrypts, parses, stages data, and then orchestrates downstream flows.

Triggers

* **Primary:** Azure **Blob Trigger** on configured containers for:  
  * Moneris token input files (mass & delta)  
  * Mastercard response mapping files  
* **Alternate:** Can be **invoked manually** by support team as per alternate flows.

Core Functionality

1. **Identify Context**  
   * Moneris mass/delta token file   
   * Mastercard response mapping file   
   * Determine file type and scenario based on container / file naming:  
2. **Initial Audit Logging**  
   * File ID  
   * File name, path/container  
   * Uploaded time, raw size  
   * Initial status \= RECEIVED.  
   * Insert new record in *Migration Audit & Control*:  
3. **File Validation**  
   * **Schema**: header/trailer, column count, required fields.  
   * **Size**: within configured min/max.  
   * **Record counts**: header/trailer vs actual rows.  
   * **Checksum**: validate checksum from file or metadata.  
   * Mark file as REJECTED with error details.  
   * Log anomaly rows in audit / anomaly table.  
   * Optionally move blob to a rejected/ container.  
   * Stop processing.

     ##### o   **Input file format** 

     Input:  
     *Input migration file for payment tokens (2026 and 2027\)*   
     * No limit for the number of records   
     * Billing system should exclude duplicate records based on Entity ID and Moneris token. 

| Field Name  | Format  | Description  | Field Type |
| :---- | :---- | :---- | :---- |
| **MONERIS\_TOKEN**  | 16 digits, starting with 9  | Moneris token  | Mandatory |
| **EXP\_DATE**  | MMYY  | Expiration date of Moneris token. May be expired  | Mandatory |
| **ENTITY\_ID**  | Up to 36 alphanumeric characters:  §  for V21 – **BAN**  §  for WinOnline Media – **GUID**  §  for TSC – **customer account number**  §  etc.  | Entity (or account), to which payment method is linked,   | Mandatory |
| **ENTITY\_TYPE**  | ‘1’ for Account Number  ‘2’ for GUID  | Account number or GUID  | Mandatory |
| **ENTITY\_STS**  | 1 character:  ‘O’ – Open/Active  ‘S’ – Suspended  ‘N’ – Cancelled  ‘C’ \- Closed  | Entity (or account) status.  It should be mapped by Channel as per definition provided.  For investigations    e.g. not available in WinOnline Media  | Optional |
| **CREATION\_DATE**  | YYYYMMDD  | Creation or last update date of the token. For cleanup.    e.g. might not be available in SS or Admin3  | Optional |
| **LAST\_USE\_DATE**  | YYYYMMDD  | Last use date of the token. For cleanup.  If not provided, it will be populated by PHUB as migration date    | Optional |
| **TRX\_SEQ\_NO**  |   | Should be left empty  | N/A |
| **BUSINESS\_UNIT**  |   | Not applicable for bulk migration, should be left empty  | Mandatory |
| **USAGE\_TYPE** | 1 character: ‘1’ – ONETIME ‘2’ – RECURRING ‘3’ – INSTALLMENT ‘4’ – UNSCHEDULE | Defines usage type of usage. | Mandatory |

      

     *Input migration file for tokens from transactional history (2027)* 

     * These files will be created by CASH and TSC applications in the Second Bulk Migration (2027) 

| Field Name  | Format  | Description  | Field Type |
| :---- | :---- | :---- | :---- |
| **MONERIS\_TOKEN**  | 16 digits, starting with 9  | Moneris token  | Mandatory |
| **EXP\_DATE**  | MMYY  | Expiration date of Moneris token. May be expired.  | Mandatory |
| **ENTITY\_ID**  |   | Should be left empty   | N/A |
| **ENTITY\_TYPE**  |   | Should be left empty   | N/A |
| **ENTITY\_STS**  |   | Should be left empty   | N/A |
| **CREATION\_DATE**  | YYYYMMDD  | Should be left empty  | N/A |
| **LAST\_USE\_DATE**  | YYYYMMDD  | Last use date of the token. For cleanup  | Optional  |
| **TRX\_SEQ\_NO**  | Alphanumeric, up to 36 characters  §  For tx in CASH: value from MERCHANT\_ORDER\_NO field in TRANSACTION\_REQUEST or BATCH\_TRANSACTION tables.  §  For TSC: TBD.  | Reference to the transaction used for extract of Moneris token (in CASH or TSC)  |   |
| **BUSINESS\_UNIT**  |   | Should be left empty  | Mandatory |
| **USAGE\_TYPE** | 1 character: ‘1’ – ONETIME ‘2’ – RECURRING ‘3’ – INSTALLMENT ‘4’ – UNSCHEDULE | Defines usage type of usage. | Mandatory |

      

     *Input migration file for ID tokens (2027)* 

     * These files will be created by V21, SuperSystem and Maestro applications in the Second Bulk Migration (2027) 

| Field Name  | Format  | Description  | Field Type |
| :---- | :---- | :---- | :---- |
| **MONERIS\_TOKEN**  | 16 digits, starting with 9  | Moneris token  | Mandatory |
| **EXP\_DATE**  | MMYY  | Expiration date of Moneris token. May be expired.  | Mandatory |
| **ENTITY\_ID**  |   | Should be left empty   | N/A |
| **ENTITY\_TYPE**  |   | Should be left empty   | N/A |
| **ENTITY\_STS**  |   | Should be left empty   | N/A |
| **CREATION\_DATE**  | YYYYMMDD  | Should be left empty  | N/A |
| **LAST\_USE\_DATE**  | YYYYMMDD  | Last use date of the token. For cleanup    | Optional |
| **TRX\_SEQ\_NO**  |   | Should be left empty  | N/A |
| **BUSINESS\_UNIT**  |   | Should be left empty  | Mandatory |
| **USAGE\_TYPE** | 1 character: ‘1’ – ONETIME ‘2’ – RECURRING ‘3’ – INSTALLMENT ‘4’ – UNSCHEDULE | Defines usage type of usage. | Mandatory |

      

     *Header and trailer in the input migration file from Billing Systems* 

     **Header**: MONERIS\_TOKEN, EXP\_DATE, ENTITY\_ID, ENTITY\_TYPE, ENTITY\_STS, CREATION\_DATE, LAST\_USE\_DATE, TRX\_SEQ\_NO, BUSINESS\_UNIT ,USAGE\_TYPE

     **Trailer**: TRANSACTION\_COUNT, TIMESTAMP 

     * Format of TRANSACTION\_COUNT: 10-digit number with leading 0s. For example, 0000123456   
     * Format of timestamp (ET): YYYYMMDDHH24MISS 

Response file format from MC 

·        

* MasterCard will generate Gateway Migration response file.   
  ·          
  * MC Gateway is expected to provide token migration response file for each input file with below the data fields. In case error happened during Gateway tokenization, detail error will be returned for each record.   
    ·        

    o      
    * ID 

    ·        

      o    

    * Moneris token 

    ·        

      o    

    * Card Brand (i.e., Visa, Mastercard, Amex as per MC specification) 

    ·        

      o    

    * Expiration Date 

    ·        

      o    

    * Gateway token (Random with Luhn, starting with 9\) 

    ·        

      o    

    * Network Tokenization status 

    ·        

      o    

    * First 6, Last 4 

    ·        

      o    

    * Funding Method Type (i.e., Credit, Debit, Prepaid or other) 

    ·        

      o    

    * Issuer information (can’t be provided by MC as bin lookup is not part of the migration) 

    ·        

      o    

    * Migration status (error, success) – may be several fields   
    * Error description (in case of error) 

      ##### §  **Master card input file format**

      Format each token record as per Mastercard input specification.  
      §  Format of input file to MC 

      §   

      §   

      §     
    * Remove duplicate tokens, so that we don’t send same Moneris token multiple times. 

      §   

      §   

      §   

    * File will have header and trailer.  

      §   

      §   

      §   

    * Header: MONERIS\_TOKEN, EXP\_DATE\_MM, EXP\_DATE\_YY 

      §   

      §   

      §   

    * trailer : BU, SOURCE\_ID, TRANSACTION\_COUNT, TIMESTAMP.  

      §   

      §   

      §   

      §   

    * Format of TRANSACTION\_COUNT: 10-digit number with leading 0s.  

      §   

      §   

      §   

      §   

    * Format of timestamp: YYYYMMDDHH24MISS 

      §   

      §   

      §   

      §   

    * Below is the example of trailer:   
      BU=WL,SOURCE\_ID=CSR, TRANSACTION\_COUNT=0000001033,TIMESTAMP=20251212130151 

| Field Name  | Format  | Description  |
| :---- | :---- | :---- |
| **MONERIS\_TOKEN**  | 16 digits starting with 9  | Moneris token  |
| **EXP\_DATE\_MM**  | MM  | Expiration month of Moneris token. May be expired.  |
| **EXP\_DATE\_YY**  | YY  | Expiration year of Moneris token. May be expired.  |

      §  *Response file format from MC  (filed mapping will be done in DDD phase)*

      ##### **Response file format from MC**

| Field Name | Format | Description |
| :---- | :---- | :---- |
| **apiOperation** |  | Empty |
| **correlationId** | 16 digits starting with ‘9’ | Moneris token |
| **sourceOfFunds.type** |  |  |
| **sourceOfFunds.provided.card.number** | 16 characters | Masked card number, including first 6 and last 4 |
| **sourceOfFunds.provided.card.expiry.month** | Blank | Expiration month of Moneris token. |
| **sourceOfFunds.provided.card.expiry.year** | Blank | Expiration year of Moneris token. |
| **result** | e.g. SUCCESS, FAILURE | Migration status (error, success) |
| **error.cause** |  | Cause of the error. Short description (1-2 words) |
| **error.explanation** |  | Error description (in case of error) |
| **error.field** |  | Field which is affected. Say, first name is provided in invalid format |
| **error.supportCode** |  | Code of the error. Recommended to keep it |
| **error.validationType** |  | What exactly was validated |
| **token** | 16 digits starting with ‘9’ | Gateway token (Random with Luhn, starting with 9\) |
| **schemeToken.status** | e.g. PROVISIONING | Network Tokenization status |
| **sourceOfFunds.provided.card.fundingMethod** |  | Funding Method Type (i.e., Credit, Debit, Prepaid or other) |
| **sourceOfFunds.provided.card.expiry** |  | Expiration date |
| **sourceOfFunds.provided.card.scheme** |  | Card Brand (i.e., Visa, Mastercard, Amex as per MC specification) |

    * Compose header/trailer and counts.

    1\.      

  * Validate:  
  * On failure: reject the file and stop processing  
2. **Decryption & Parsing**  
   * Token records (Moneris).  
   * Token mappings (Mastercard response).  
   * Decrypt file content (PGP or similar) **in-memory or streaming**.  
   * Parse data into internal DTOs:  
   * Per-record structural validation (field formats, mandatory fields).  
3. **Bulk Insert into Migration DB**  
   * For Moneris files: load all Moneris tokens.  
     * File Id is the key to trigger next function  
   * For Mastercard response mapping : load response mappings.  
     * Do not assign any assign migration batch id  
   * Structurally OK → PENDING.  
   * Bad/missing critical data → REJECT.  
   * Bulk load parsed records into **migration staging tables**:  
   * Assign per-record statuses:  
4. **Audit & Metrics**  
   * File ID, row counts (total/pending/reject).  
   * Anomalies summary.  
   * Status \= INGESTED.  
   * Update Migration Audit & Control:  
5. **Downstream Triggers (Batch/Batchless)**  
   * Trigger Token File Processor \-\> Validate Tokens with FileId.  
   * When validation completes (or in defined order), trigger Token File Processor \-\> Create Token Batch.  
   * Finally trigger Token Processor for further action.

   * After Mastercard response file ingestion, trigger:  
     * Validate Tokens  
     * Create Token Batch (for migration batches)  
     * Token Processor (mode manager) via a queue/event.  
   * For **Moneris file**:  
   * For **mastercard file**:  
6. **NFR Handling in this Function**  
   * Streaming read, batch inserts, parallel processing where safe.  
   * Optimised for **large file streaming** (up to 20M records, completion ≤ 10 minutes) using:  
   * **Checkpointing**: able to restart from last committed file offset / batch in case of failure.  
   * **Security**: Never log privacy info; mask or omit any token / sensitive info in logs and errors.

 

##### **Token File Processor \-\> Validate Tokens (Azure Function)**

Purpose

Validate staged Moneris tokens, Mastercard token (from mapping file) where applicable against the **Payment Hub DB**, marking records as valid or rejected for migration.

Triggers

* **Primary:** Queue/Service Bus message from:  
  * Token File Processor after ingestion.  
* **Alternate:** Manual trigger by support team.

Core Functionality

1. **Select Records for Validation**  
   * MasterCardBatchID= input batchID.  
   * Status \= PENDING.  
   * Read from migration staging tables where:  
2. **Lookup in Payment Hub DB**  
   * PAYMENT\_METHOD  
   * TOKENIZED\_CARD  
   * ENTITY\_DETAILS  
   * ENTITY\_PMR\_MAPPING  
   * PMR\_MONERIS\_MAPPING (detect duplicates / prior migrations as needed).  
   * Entity exists and is active.  
   * Payment method is eligible for migration.  
   * No conflicting or duplicate token mappings.  
   * Any business-specific rules (e.g. expiration date check).  
   * Validate against:  
   * Typical checks:  
3. **Set Token Validation Status (per token)**  
   * Write error code & reason into error columns / companion table.  
   * If all checks pass → keep or set status \= PENDING (valid, ready for batching).  
   * If any check fails → set status \= REJECT:  
4. **Log Validation Statistics**  
   * Valid vs rejected tokens.  
   * Time taken, key error categories.  
   * Write counts per file to Migration Audit & Control:  
5. **Signal Next Step**  
   * Trigger Token File Processor \-\> Create Token Batch.  
   * When validation completes for that file:  
6. **NFRs**  
   * Skip previously validated records where status is final (REJECT, COMPLETED).  
   * Process tokens in scalable chunks to meet the 20M / 15-min requirement.  
   * Maintain idempotency / checkpointing:

 

##### **Token File Processor \-\> Create Token Batch (Azure Function)**

Purpose

Group validated tokens into **batches** suitable for downstream processing:

·        

* Mastercard **input batches**  
  * **Migration batches** for PHUB updates  
  * **Migration batches** for delta migration (if needed)  
     NOTE: batches may not be needed for Moneris tokens

Triggers

·        

* **Primary:** Queue/Service Bus message after Validate Tokens.  
  * **Alternate:** Manual invocation.

Core Functionality

1.    
   1. **Fetch Eligible Tokens**  
      * From migration staging tables where:  
        * Status \= PENDING (valid).  
        * FileId \= specific file.  
        * Not yet assigned to a batch.  
   2. **Determine Batch Type & Limits**  
      * Read configuration for:  
        * Max tokens per batch.  
        * Batch type (e.g., MC\_INPUT for Mastercard request vs MIGRATION for PHUB updates vs DELTA).  
        * Any partitioning logic (by merchant- business unit or other keys).  
   3. **Create Batch Records**  
      * Insert into BATCH\_HEADER:  
        * BatchId, BatchType, FileId, counts, current status.  
      * Associate tokens with batch:  
        * Link via BatchId column in staging.  
   4. **Update Token Records**  
      * Set BatchId and keep status as PENDING for migration.  
      * Optionally update token status (e.g., BATCHED).  
   5. **Audit Logging**  
      * Update Migration Audit & Control with:  
        * Number of batches created.  
        * Number of tokens per batch and type.  
   6. **Trigger Next Stage**  
      * Trigger Token Processor with mode to **create Mastercard input file** for each input batch.

Trigger Token Processor with mode manager to process migration batches.

##### **Token Processor (Azure Function) \- Multiple Modes**

 

This function is responsible for **file generation**, **batch orchestration**, and **per-batch PHUB updates** in different modes.

Triggers

·        

* Queue/Service Bus messages with payload including:  
  * mode (e.g. fileGen, manager, worker, realtime).  
    * batchId and/or contextual ids.  
  * Manual invocation (whole function) is also allowed per alternate flows.

###### **Token Processor (Azure Function) \- Mode : fileGen**

**Purpose**  
 Take Mastercard input batch id and create outbound file for Mastercard, then wait for response.

**Functionality**

1.    
   1. **Read Batch Data**  
      * Fetch tokens belonging to the specified Mastercard input batch id.  
   2. **Generate Mastercard Input File**  
      * Format each token record as per Mastercard input specification.  
        Format of input file to MC   
      * Remove duplicate tokens, so that we don’t send same Moneris token multiple times.   
      * File will have header and trailer.    
      * Header: MONERIS\_TOKEN, EXP\_DATE\_MM, EXP\_DATE\_YY   
      * trailer : BU, SOURCE\_ID, TRANSACTION\_COUNT, TIMESTAMP.  

        §   

      * Format of TRANSACTION\_COUNT: 10-digit number with leading 0s.  

        §   

      * Format of timestamp: YYYYMMDDHH24MISS 

        §   

      * Below is the example of trailer:   
        BU=WL,SOURCE\_ID=CSR, TRANSACTION\_COUNT=0000001033,TIMESTAMP=20251212130151 

| Field Name  | Format  | Description  |
| :---- | :---- | :---- |
| **MONERIS\_TOKEN**  | 16 digits starting with 9  | Moneris token  |
| **EXP\_DATE\_MM**  | MM  | Expiration month of Moneris token. May be expired.  |
| **EXP\_DATE\_YY**  | YY  | Expiration year of Moneris token. May be expired.  |

      * Compose header/trailer and counts.  
      * Qualification Criteria  
2.  

| Validation Key | Condition | MESSAGE | PG\_EXPORT\_QUALIFICATION |
| :---: | ----- | ----- | ----- |
| Moneris Token | Moneris token exists in PMR\_MONERIS\_MAPPING | Moneris token already handled | NOT\_QUALIFIED |
| ENTITY\_UPDATE\_STATUS | if ENTITY\_UPDATE\_STATUS is TBD AND ENTITY ID does not exist in ENTITY\_DETAILS for corresponding entity | N/A | \<DO\_NOT\_TOUCH\> |
| ENTITY\_UPDATE\_STATUS | if ENTITY\_UPDATE\_STATUS is TBD AND ENTITY ID exist in ENTITY\_DETAILS for corresponding entity | ENTITY Already exists | \<DO\_NOT\_TOUCH\> |
| ENTITY\_UPDATE\_STATUS | if ENTITY\_UPDATE\_STATUS is TBD AND ENTITY ID exist in ENTITY\_PMR\_MAPPING for corresponding entity and PMR | ENTITY and PMR already mapped | \<DO\_NOT\_TOUCH\> |
| Moneris Token | Moneris token does not starts with 9 | Moneris token does not starts with 9 | NOT\_QUALIFIED |
| Moneris Token | Moneris token is more than 16 digits | Moneris token is more than 16 digits | NOT\_QUALIFIED |
| Moneris Token | Moneris token is less than 16 digits | Moneris token is less than 16 digits | NOT\_QUALIFIED |
| Expiry Date | Token expiry date does not contains 4 digits | Token expiry date does not contains 4 digits | NOT\_QUALIFIED |
| Expiry Date | Expiry date is in the past and PMR\_MONERIS\_MAPPING does not exist |  | QUALIFIED |
| Expiry Date | PMR\_MONERIS\_MAPPING has Moneris token and PMR( PG Token ) with expiry date future to expiry date in MONERIS\_TOKEN\_STAGING |  | NOT\_QUALIFIED |
| ENTITY\_TYPE | ENTITY\_TYPE is not valid |  | QUALIFIED |
| MONERIS\_TOKEN\_STAGING \- Attributes EXP\_DATE | Mandatory attribute missing | Mandatory attribute \<Attribute Names\> missing | NOT\_QUALIFIED |
| MONERIS\_TOKEN\_STAGING \- Attributes ~~ENTITY\_TYPE~~ ~~ENTITY\_STS~~ BUSINESS\_UNIT ENTITY\_ID | Mandatory attribute missing and mass migration flow is executed | Mandatory attribute \<Attribute Names\> missing | NOT\_QUALIFIED |
| MONERIS\_TOKEN\_STAGING \- Attributes ~~ENTITY\_TYPE~~ ~~ENTITY\_STS~~ BUSINESS\_UNIT ~~ENTITY\_ID~~ | Mandatory attribute missing and delta migration flow is executed | Mandatory attribute \<Attribute Names\> missing | QUALIFIED |
| BUSINESS\_UNIT | BUSINESS\_UNIT is not valid | BUSINESS\_UNIT is not valid | QUALIFIED |
| Moneris Token | Moneris token duplicate in file | Moneris token duplicate in file | NOT\_QUALIFIED |
| FILE\_ID Prefix | FILE\_ID does not start with 1000000 | Invalid FILE\_ID prefix | NOT\_QUALIFIED |
| BATCH\_ID Prefix | BATCH\_ID does not start with 1000000 | Invalid BATCH\_ID prefix | NOT\_QUALIFIED |
| PMR Prefix | PMR does not start with 8 | Invalid PMR prefix | NOT\_QUALIFIED |
| EXP\_DATE\_MM | EXP\_DATE\_MM not in 1..12 or equals 0 | Invalid month in EXP\_DATE\_MM | NOT\_QUALIFIED |
| EXP\_DATE\_YY | EXP\_DATE\_YY equals 0 or out of range 1..99 | Invalid year in EXP\_DATE\_YY | NOT\_QUALIFIED |
| PG\_FILE\_ID Null | PG\_FILE\_ID is NULL | Missing PG\_FILE\_ID | NOT\_QUALIFIED |
| PG\_CORRELATIONID Match | PG\_CORRELATIONID does not equal MONERIS\_TOKEN | PG\_CORRELATIONID must match Moneris Token | NOT\_QUALIFIED |
| Creation Date Present | CREATION\_DATE is NULL | Missing CREATION\_DATE | NOT\_QUALIFIED |
| Last Use \>= Creation | LAST\_USE\_DATE earlier than CREATION\_DATE | LAST\_USE\_DATE cannot be earlier than CREATION\_DATE | REVIEW |
| Duplicate Token in Batch | MONERIS\_TOKEN repeats within same FILE\_ID | Duplicate Moneris Token in batch | NOT\_QUALIFIED |
| Export Readiness | Any ERROR rule triggered | Not ready for export | NOT\_QUALIFIED |
| Out File Status \- Ready | No ERROR, at most WARN/INFO, mapping complete | Ready for PG Out file | QUALIFIED |

   1. **Write to Storage**  
      * Create one file per cohort id, if cohort id is null , create one file per file id  
      * Store file in outbound blob container for Mastercard.  
      * File name  
        * when cohort id is null\<billing file input\>.pg.input  
        * when cohort id is not null cohort\_\<cohort\_id\>.pg.input  
      * Update batch status to AWAITING\_MC\_RESPONSE.  
   2. **Audit**  
      * Insert audit entry with:  
        * BatchId, filename, record count, status.  
   3. **Wait State**  
      * No further action until Mastercard response mapping file is uploaded

###### **Token Processor (Azure Function) \- Mode : Manager**

**Purpose**  
 Coordinate batch processing by **discovering eligible migration batches** and dispatching work to worker instances.

**Functionality**

1.    
   1. **Read Batches Ready for Migration**  
      * Query batches with:  
        * Type \= MIGRATION  
        * Status \= READY\_FOR\_MIGRATION or equivalent.  
   2. **Audit – Manager Start**  
      * Insert audit row:  
        * Operation \= MANAGER\_START  
        * Total eligible batches found.  
   3. **Dispatch Worker Jobs**  
      * For each batch:  
        * Insert audit row MANAGER\_DISPATCH\_BATCH.  
        * Enqueue a Token Processor message with:  
          * mode \= worker  
          * batchId.

    

   ###### **Token Processor (Azure Function) \- Mode : Worker**

   **Purpose**  
             Apply updates to the **Payment Hub DB** for a specific batch and decide when to invoke Audit and Control.

   **Functionality**

1.    
   1.    
      1. **Audit – Worker Start**  
         * Insert audit record (insert-only):  
           * Operation \= WORKER\_START  
           * BatchId, timestamp.

      2. **Fetch Batch Tokens**  
         * Retrieve all tokens in the given batch, with associated mapping info from Mastercard response (for UC-02) or delta mapping (UC-03).  
      3. **Apply DB Updates**  
         * Update Payment Hub tables as per migration logic:  
           * PAYMENT\_METHOD  
           * TOKENIZED\_CARD  
           * ENTITY\_DETAILS  
           * ENTITY\_PMR\_MAPPING  
           * TOKEN\_ACTIVITY\_LOG  
           * PMR\_MONERIS\_MAPPING.

         * Set per-token migration status:  
           * COMPLETED / ERROR.  
      4. **Update Migration Tables**  
         * Update migration staging/final tables for each token with final status and error metadata.  
      5. **Audit – Worker Complete**  
         * Insert audit record:  
           * Operation \= WORKER\_COMPLETE  
           * BatchId, counts of success/error.  
      6. **Check Pending Batches**  
         * If no other batches remain in READY\_FOR\_MIGRATION or IN\_PROGRESS:

      Trigger Audit and Control function.

###### **Token Processor (Azure Function)- Mode : RealtimeTokenization**

**Purpose**  
 Handle **sequential, real-time tokenization** where tokens are processed as they arrive and PHUB API is invoked directly.

**Functionality**

1.    
   1. **Sequential Processing**  
      * For each incoming token:  
        * Validate token (may reuse Validate Tokens logic inline or via sub-call).  
        * Immediately invoke CreateMCTokenFromMonerisToken API through SSG to create/update token objects.  
   2. **Logging & Audit**  
      * Record each token’s outcome in migration DB and audit tables.  
   3. **Checkpointing**  
      * N/A \- always restart from API call.

##### **Audit and Control (Azure Function)**

**Purpose**

Perform **end-to-end reconciliation** for a migration run (or delta run), update reporting tables, and then trigger the Billing Mapping file generation (if needed) and send status notification.

**Triggers**

·        

* Queue/Service Bus message from Token Processor-\>worker when all batches are completed.  
  * Manual invocation allowed as alternate flow.

**Core Functionality**

1.    
   1. **Verify Migration Completeness**  
      * Reconcile:  
        * Tokens ingested  
        * Tokens processed by workers (completed \+ error \+ reject).  
      * Ensure no tokens left in inconsistent statuses (e.g. still PENDING).  
   2. **Update Reporting Tables**  
      * Update migration reporting tables per file/batch:  
        * Totals by status: COMPLETED, REJECT, ERROR.  
        * Any anomalies or discrepancies.  
   3. **Update Overall Token Migration Status**  
      * Set high-level job/file status:  
        * COMPLETED, COMPLETED\_WITH\_ERRORS, or FAILED.  
   4. **Trigger Next Step**  
      * Invoke Generate Billing Mapping File with the migration job/file id.  
      * Send notification email  
   5. **NFRs**  
      * Must be restartable:  
        * If rerun, only recompute aggregates; keep base token statuses intact.

##### **Generate Billing Mapping File (Azure Function)**

**Purpose**

Generate **Billing Mapping File** linking Moneris tokens to migrated Mastercard tokens and store it into blob storage for the Billing system’s consumption.

**Triggers**

·        

* Queue/Service Bus message/API from Audit and Control.  
  * Manual invocation allowed.

**Core Functionality**

1.    
   1. **Collect Mapping Data**  
      * Query migration DB and/or Payment Hub DB:  
        * Use PMR\_MONERIS\_MAPPING, TOKENIZED\_CARD, ENTITY\_PMR\_MAPPING, etc.  
      * Only include tokens with final status COMPLETED (or per agreed rule).  
   2. **Construct Mapping File**  
      * Compose the Billing mapping file with required fields:  
        * Moneris token / PMR.  
        * New Mastercard token / PMR.  
        * Entity / account identifiers.  
        * Effective dates and migration status.

        §  Response file format to Billing systems 

      * The response file will be generated only for payment tokens file, not ID or transactional history.   
      * In phase1 response file will be sent to WinOnline Media only   
      * WinOnline Media should use response file to replace Moneris tokens with PMRs.   
      * Below is the format for the response file to be sent to Billing systems: 

| Field Name  | Format  | Description  |
| :---- | :---- | :---- |
| **MONERIS\_TOKEN**  | 16 digits, starting with 9  | Moneris token  |
| **EXP\_DATE**  | MMYY  | Expiration date of Moneris token. May be expired.  |
| **ENTITY\_ID**  | Up to 36 alphanumeric characters:  §  for V21 – **BAN**  §  for WinOnline Media – **GUID**  §  for TSC – **customer account number**   etc.  | Entity (or account), to which payment method is linked,   |
| **ENTITY\_REF\_TYPE**  | 1 digit  ‘1’ – Account Number  ‘2’ \- GUID  | Account number or GUID. Same as in the input file  |
| **PMR**  | 16 digits, starting with ‘8’  | PMR will not have last 4 digits of the credit card  |
| **CARD\_BRAND**  | 1 character  ‘V’ – Visa  ‘M’ – Mastercard  ‘A’ \- Amex  | Card brand  |
| **FIRST\_SIX**  | 6 digits  | First six digits of the credit card  |
| **LAST\_FOUR**  | 4 digits  | Last four digits of the credit card  |
| **FUNDING\_METHOD**  | Enumeration:  CHARGE  CREDIT  DEBIT  UNKNOWN  | Funding Method Type (i.e., Credit, Debit, Prepaid or other).     Do Billing systems need it? No direct need, but will be sent, and can be ignored by the app.  |

        §   

      * YD recommendation is to split response file from MC to records with success and failures. Failures file will not be sent to Billing systems.   
      * Reference table or property file will be created to keep configuration if response file should be generated as part of bulk/delta migration for specific Billing System.   
      * Fallout management will be described in the YD solution.   
        §  Migration output file naming convention   
        * Input file name from Billing systems will follow “Source\_ID.Type.YYYYMMDD.NNNN.input” convention, where:   
        * Source\_ID: V21, WINM (for WinOnline Media), etc.   
        * Type: P (payment tokens for future use), T (transactional history), I (ID).   
        * YYYYMMDD: year, month, day   
        * NNNN: File sequence no, starting from 0001   
        * Output file name to Billing systems will follow “Source\_ID.Type.YYYYMMDD.NNNN.output” convention  
        * Each file will have file sequence number increased by 1\.    
        * Each sequence will have   
      * *Header and trailer in the migration output file to Billing Systems*

        §  **Header**: MONERIS\_TOKEN, EXP\_DATE, ENTITY\_ID, ENTITY\_REF\_TYPE, PMR, CARD\_BRAND, FIRST\_SIX, LAST\_FOUR, FUNDING\_METHOD

        §  **Trailer**: TRANSACTION\_COUNT, TIMESTAMP 

        * Format of TRANSACTION\_COUNT: 10-digit number with leading 0s. For example, 0000123456   
        * Format of timestamp (ET): YYYYMMDDHH24MISS   
      *    
   3. **Write to Blob Storage**  
      * Store file in configured outbound container (e.g., outgoing/billing-mapping).  
      * Add metadata:  
        * JobId/FileId, record count, creation timestamp.  
   4. **Update Reporting**  
      * Record file details in reporting tables:  
        * File name, blob path, counts, status BILLING\_MAPPING\_GENERATED.  
   5. **Optional Notification**  
      * Optionally emit event/queue message to notify Billing system or operations that the mapping file is available.

##### **Post Migration Task \- Update Issuer  (Azure Function)**

**Purpose**

Update Issuer post mass migration ececution 

**Triggers**

·        

* Queue/Service Bus message/API from Audit and Control.  
  * Manual invocation allowed.

**Core Functionality**

Update values where source and target both are phub database

·        

o    

* Update Issuer name in TOKENIZED\_CARD table   
  * Only update  tokens with final status COMPLETED (or per defined rules in detailed design).

**Update Reporting**

·        

* Record updated stats in reporting tables:

#### **Fallout Handling**

| Fallout | Remediation Options |
| ----- | ----- |
| Moneris token is invalid | 1\. Resubmit token in new file 2\. Resubmit token in GetPGToken API 3\. Retry tokens using Delta Migration. |
| PG token is invalid | Same as "Moneris token is invalid" |
| PG token not provided by Mastercard | Same as "Moneris token is invalid" |
| Token processor failed for one batch id | 1\. Same as "Moneris token is invalid" 2\. Retry token processor |
| Moneris API failed for delta migration | Same as "Token processor failed for one batch id" |
| Mastercard submit batch API failed for delta migration | Same as "Token processor failed for one batch id" |
| Mastercard Get batch status API did not return "complete" status with in defined timeout for delta migration | 1\. Mark batch for "resume status check" 2\. Same as "Token processor failed for one batch id" 3\. Same as "Moneris token is invalid" |
| Mastercard Get batch result API failed | 1\. Mark batch for "resume status check" 2\. Same as "Token processor failed for one batch id" 3\. Same as "Moneris token is invalid" |
| Mastercard Validate batch result API failed | 1\. Invoke Mastercard validate batch API manually and Mark batch for "resume status check" |
| Billing file not generated | Retry Azure function to generate billing output file |
| Post migration data (like issuer\_name, Card Level) is missing | Retry Azure function for post migration tasks. |
| Email not sent | Bug \- Code fix needed. |
| Next Azure function not triggered | 1\. Bug \- Code fix needed. 2\. Trigger Azure function manually. |

### **Note: How to perform remediations will be added to the operations guide.**

 

### **Transformations**

Majority of data movement between applications require some level of data transformation to deal with differences between the respective source and target systems.  The magnitude of the required transformation necessary to support the architecture needs to be articulated.

### **Validation**

If there are data mappings and transformations included in scope, then the architecture needs to also address how the validation of the transformations are to be addressed. This is critical when assessing the architecture associated with data migration activities.

 

### **Test Scenarios for TDD**

| Test Scenario ID | Area | Component (Function) | Scenario | Given (Pre-requisite) | When (Test Steps) | Then (Expected Result) |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| Mass\_migration\_0010 | Ingestion | Token File Processor | Upload Moneris file | Valid header/trailer, counts match, tokens valid | File uploaded from azure portal | Staging populated, batch created, email sent |
| Mass\_migration\_0020 | Ingestion | Token File Processor | Upload PG file | PG file contains all error (rainy day) scenarios and all happy path scenarios | File uploaded from azure portal | PG\_TOKENS\_STAGING and MONERIS\_TOKENS\_STAGING populated |
| Mass\_migration\_0030 | Token processing | Token Processor | Process all tokens | PG\_TOKENS\_STAGING and MONERIS\_TOKENS\_STAGING has all flags populated as per happy path and rainy day scenarios | Token Processor is triggered. | tables updated as per design Migration Tables: TOKEN\_MIGRATION\_BATCH TOKEN\_MIGRATION\_AUDIT\_LOG MIGRATION\_ERROR\_DETAILS PHUB Tables: PAYMENT\_METHOD TOKENIZED\_CARD ENTITY\_DETAILS ENTITY\_PMR\_MAPPING PMR\_MONERIS\_MAPPING TOKEN\_ACTIVITY\_LOG (if existing token attributes is changed) |
| Mass\_migration\_0040 | Output file Generation | Generate Billing Mapping File | Generate Billing Mapping File | All moneris tokens are processed MONERIS\_TOKENS\_STAGING table having corresponding status | Generate Billing Mapping File is triggered | Billing Mapping File is generated |
| Mass\_migration\_0050 | FalloutHandling | Token Processor | Handle fallouts | MONERIS\_TOKENS\_STAGING has falled out tokens | Token Processor is triggered. | Fallouts are handled as per remediation rules. |
| Mass\_migration\_0060 | Validation | Validate Tokens | \>50% invalid tokens | Majority invalid | Validation completes | File rejected |
| Delta\_migration\_0110 | Ingestion | Token File Processor | Upload Moneris file | Valid header/trailer, counts match, tokens valid | File uploaded from azure portal | Staging populated, batch created, email sent |
| Delta\_migration\_0120 | Token processing | Token Processor | Process all tokens | ~~PG\_TOKENS\_STAGING and~~ MONERIS\_TOKENS\_STAGING has all flags populated as per happy path and rainy day scenarios | Token Processor is triggered. | tables updated as per design Migration Tables: TOKEN\_MIGRATION\_BATCH TOKEN\_MIGRATION\_AUDIT\_LOG MIGRATION\_ERROR\_DETAILS PHUB Tables: PAYMENT\_METHOD TOKENIZED\_CARD ENTITY\_DETAILS ENTITY\_PMR\_MAPPING PMR\_MONERIS\_MAPPING TOKEN\_ACTIVITY\_LOG (if existing token attributes is changed) |
| Delta\_migration\_0130 | Output file Generation | Generate Billing Mapping File | Generate Billing Mapping File | All moneris tokens are processed MONERIS\_TOKENS\_STAGING table having corresponding status | Generate Billing Mapping File is triggered | Billing Mapping File is generated |
| Delta\_migration\_0140 | FalloutHandling | Token Processor | Handle fallouts | MONERIS\_TOKENS\_STAGING has falled out tokens | Token Processor is triggered. | Fallouts are handled as per remediation rules. |
| Realtime\_tokenization\_0110 | Realtime tokenization | pg-token-management-ms | process one token | PG token does not exist in PHUB DB | Get PG token API is invoked | Mastercard online API is invoked through CIP service following PHUB Tables are updated: PAYMENT\_METHOD TOKENIZED\_CARD ENTITY\_DETAILS ENTITY\_PMR\_MAPPING PMR\_MONERIS\_MAPPING TOKEN\_ACTIVITY\_LOG (if existing token attributes is changed) PG token details are sent in response |

### **Error Handling** 

Provide an overview on how ETL error handling is addressed within the ETL activities. Approaches on how to deal with error handling will vary dramatically between applications. E.g., Data Warehousing requirements tend to be more lenient than OLTP applications.

The Mass Migration microservice implements comprehensive error handling across all stages of token migration processing. The approach balances data quality requirements with operational resilience, ensuring token validation errors are captured and reported while system errors trigger automatic retries. All errors are logged to a centralized audit system with structured tracking for investigation and recovery. Unlike traditional ETL processes, the migration handles transactional token data where accuracy is critical. The system employs a fail-fast validation strategy with configurable failure thresholds, while processing errors use queue-based retry mechanisms with exponential backoff to handle transient failures.

**Error Handling Strategy by Stage**

**1\. File Ingestion Errors (uploadFile Function)**

**Error Types:**

* Invalid file format or structure  
* Duplicate file detection  
* CSV parsing errors  
* Database insertion failures

**Handling Approach:**

* File Format Validation: Files are validated against expected schema before processing  
* Duplicate Detection: File ID uniqueness checked; duplicates rejected immediately  
* CSV Parse Errors: Individual row errors logged; processing continues for valid rows

Database Errors: Transaction rollback; entire file marked as FAILED

**Error Logging:**

// All errors logged to TOKEN\_MIGRATION\_AUDIT\_LOG

await insertAuditLog(

  fileId,

  null,

  AuditMessageCodes.FILE\_UPLOAD\_FAILED,

  \`File upload failed: ${error.message}\`,

  { fileName, error: error.message },

  'ERROR'

);

**Recovery Mechanism:**

* Failed files remain in blob storage for manual inspection  
* HTTP API endpoint allows manual re-upload after correction  
* File status in TOKEN\_MIGRATION\_BATCH marked as 'FAILED' for tracking

### **2\. Token Validation Errors (validateTokens Function)**

**Error Types:**

* Business rule violations (E001-E010)  
* Payment Hub connectivity failures  
* Failure threshold exceeded

**Handling Approach:**

* Individual Token Errors: Each token validated independently; failures do not stop processing  
* Error Codes Assigned: Specific error codes (E001-E010) assigned based on validation failure type  
* Threshold Check: If failure rate exceeds configured threshold (default 50%), entire file rejected  
* Detailed Error Tracking: All validation failures recorded in MIGRATION\_ERROR\_DETAILS table

**Error Classification:**

| Error Code | Description | Severity | Action |
| :---- | :---- | :---- | :---- |
| E001 | Invalid token format | Token-level | Mark token INVALID, continue processing |
| E002 | Invalid token length | Token-level | Mark token INVALID, continue processing |
| E003 | Invalid token prefix | Token-level | Mark token INVALID, continue processing |
| E004 | Missing mandatory field | Token-level | Mark token INVALID, continue processing |
| E005 | Invalid expiry date | Token-level | Mark token INVALID, continue processing |
| E006 | Token expired | Token-level | Mark token INVALID, continue processing |
| E007 | Duplicate token in file | Token-level | Mark duplicate INVALID, process first occurrence |
| E008 | Token already exists in Payment Hub | Token-level | Mark token INVALID, skip migration |
| E009 | Invalid entity type | Token-level | Mark token INVALID, continue processing |
| E010 | Invalid entity status | Token-level | Mark token INVALID, continue processing |

**Failure Threshold Logic:**

const failureRate \= (invalidCount / totalCount) \* 100;

const threshold \= await getConfigValue(\`FAILURE\_THRESHOLD\_PERCENTAGE\`, 50);

if (failureRate \> threshold) {

  // Reject entire file

  await updateBatchStatus(fileId, 'FAILED');

  await sendValidationFailureEmail({

	fileId,

	failurePercent: failureRate,

	threshold

  });

  throw new Error(\`Validation failure threshold exceeded: ${failureRate}%\`);

}

**Error Persistence:**

\-- Detailed error tracking

INSERT INTO MIGRATION\_ERROR\_DETAILS

(FILE\_ID, BATCH\_ID, MONERIS\_TOKEN, ENTITY\_ID, ERROR\_CODE, ERROR\_MESSAGE, ERROR\_TYPE)

VALUES (@fileId, NULL, @monerisToken, @entityId, 'E005', 'Invalid expiry date', 'VALIDATION');

\-- Token status update

UPDATE MONERIS\_TOKENS\_STAGING

SET VALIDATION\_STATUS \= 'INVALID', ERROR\_CODE \= 'E005'

WHERE ID \= @tokenId;

**Recovery Mechanism:**

* Validation errors cannot be retried automatically  
* Operations team notified via email with failure statistics  
* Failed tokens exported to failure file for billing system remediation  
* File can be corrected and re-uploaded with new file ID

**3\. Batch Processing Errors (batchWorker Function)**

**Error Types:**

* Database query failures  
* Payment Hub update failures  
* Missing PG tokens (NO\_PG\_TOKEN)  
* Transient system errors

**Handling Approach:**

* Token-Level Failures: Missing PG tokens marked as FAILED with error code; batch continues  
* Batch-Level Failures: System errors (DB connectivity) fail entire batch; queue retry triggered  
* Transaction Isolation: Each batch processed in isolation; failures don't impact other batches  
* Worker Tracking: Worker status recorded in TOKEN\_MIGRATION\_WORKERS for monitoring

**Migration Error Handling:**

for (const moneris of monerisTokens) {

  const pgToken \= pgTokenMap.get(moneris.MONERIS\_TOKEN);

  if (pgToken && pgToken.RESULT \=== 'SUCCESS' && pgToken.PG\_TOKEN) {

	try {

  	// Generate PMR and update Payment Hub

  	const pmr \= generatePMR();

  	await updatePaymentHub(moneris, pgToken, pmr);

  	// Mark as completed

  	await updateTokenStatus(moneris.ID, 'COMPLETED', pmr);   

	} catch (error) {

  	// System error \- will trigger batch retry

  	logger.error('Payment Hub update failed', error);

  	throw error;

	}

  } else {

	// Business error \- mark token as failed and continue

	await updateTokenStatus(moneris.ID, 'FAILED', null, 'NO\_PG\_TOKEN');

	await insertErrorDetails(fileId, batchId, moneris.MONERIS\_TOKEN,

                             moneris.ENTITY\_ID, 'NO\_PG\_TOKEN',

                             'No Mastercard token received');

  }

}

**Queue Retry Mechanism:**

* Automatic Retries: Azure Storage Queue retries failed batches up to 5 times  
* Exponential Backoff: Delay increases with each retry attempt  
* Poison Queue: After max retries, message moved to poison queue for manual review  
* Dequeue Count Tracking: Retry count available in queue message metadata

**Error Recovery:**

* Failed batches can be manually reprocessed by updating status to 'PENDING' and re-queuing  
* Worker status tracked for debugging stuck batches  
* Database transaction rollback prevents partial updates

**4\. Stale Batch Detection (auditControl Function)**

**Error Types:**

* Batches stuck in PROCESSING status (\> 30 minutes)  
* Hung worker instances  
* Queue processing failures

**Handling Approach:**

* Timer-Based Monitoring: Runs every 5 minutes to detect stale batches  
* Automatic Timeout: Batches exceeding threshold marked as FAILED  
* Alert Logging: Stale batches logged with ERROR severity for investigation

**Stale Batch Detection Logic:**

SELECT BATCH\_ID, FILE\_ID, PROCESS\_START\_TIME

FROM TOKEN\_MIGRATION\_BATCH

WHERE STATUS \= 'PROCESSING'

AND BATCH\_ID \!= FILE\_ID

AND PROCESS\_START\_TIME \< DATEADD(MINUTE, \-30, GETUTCDATE())

**Error Logging:**

await insertAuditLog(

  batch.FILE\_ID,

  batch.BATCH\_ID,

  AuditMessageCodes.BATCH\_FAILED,

  'Batch marked as failed due to timeout',

  { staleThresholdMinutes: 30 },

  'ERROR'

);

**Recovery Mechanism:**

* Stale batches automatically marked as FAILED  
* Operations team alerted via audit log  
* Manual investigation required to determine root cause  
* Batch can be reset to PENDING and re-queued after issue resolution

**5\. File Generation Errors (fileGen, generateBillingFile Functions)**

**Error Types:**

* CSV generation failures  
* Blob upload failures  
* Insufficient tokens for processing

**Handling Approach:**

* CSV Generation: Errors in CSV serialization logged and function retried  
* Blob Upload: Transient storage errors trigger automatic retry via queue  
* Empty Results: No files generated if no tokens to process (logged as INFO)

**Error Recovery:**

* HTTP API endpoint allows manual trigger for file regeneration  
* Failed file generation logged to audit trail  
* Queue retry mechanism handles transient failures

Application Error Logging/Handling/Persistence

This is a centralized component that will be used for logging exception or for performing application specific logging like usage tracking etc. Specifically it should

**Centralized Logging Architecture**

The migration service implements a **three-tier logging strategy** with structured logging, database audit trails, and Application Insights telemetry.

* Provide a common API for use  
  * All functions use a centralized logger with consistent interface:  
    o   // Logger creation with context  
     const logger: Logger \= createLogger('functionName', context, { fileId, batchId });  
    // Standard logging methods  
    [logger.info](http://logger.info/)('Operation completed', { recordCount: 100 });  
    logger.warn('Threshold approaching', { failureRate: 45 });  
    logger.error('Processing failed', error, { tokenId: 123 });  
    logger.debug('Detailed trace', { tokenData: {...} });  
    Logger Features:  
    * Automatic Context Injection: InvocationContext automatically added  
    * Structured Metadata: All logs include fileId, batchId when available  
    * Correlation IDs: Azure Functions invocation ID tracks requests  
    * Sensitive Data Masking: Tokens masked in logs (only first 4 and last 4 digits shown)  
* Provide a standard format for logging

  o   Application Insights Format:

  {

    "timestamp": "2024-01-15T10:30:45.123Z",

    "level": "ERROR",

    "category": "batchWorker",

    "message": "Batch processing failed",

    "invocationId": "abc123-def456-ghi789",

    "customDimensions": {

  	"fileId": "V21.P.20240115.0001",

  	"batchId": "V21.P.20240115.0001-B0001",

  	"errorMessage": "Connection timeout",

  	"stackTrace": "..."

    }

* Provide guidelines of propagating error and bubbling up the errors  
  * Function-Level Error Handling

                 

async function batchWorkerHandler(queueItem: unknown, context: InvocationContext): Promise\<void\> {

  const logger \= createLogger('batchWorker', context, { batchId });

  try {

	// Update status to PROCESSING

	await updateBatchStatus(batchId, 'PROCESSING');

	// Process batch

	await processMassMigrationBatch(batchId, fileId, logger);

	// Update status to COMPLETED

	await updateBatchStatus(batchId, 'COMPLETED', successCount, failureCount);

  	} catch (error) {

	// Log error with full context

	logger.error('Batch processing failed', error);

	// Update batch status

	await updateBatchStatus(batchId, 'FAILED');   

	// Insert audit log

	await insertAuditLog(fileId, batchId, AuditMessageCodes.BATCH\_FAILED,

  	\`Batch failed: ${error.message}\`, { error: error.message }, 'ERROR');

	// Re-throw to trigger queue retry

	throw error;

  }

}

Error Bubbling Strategy:

* Token-Level Errors: Caught and logged; processing continues  
* Batch-Level Errors: Propagated to function handler; triggers queue retry  
* System-Level Errors: Logged to Application Insights; alerts triggered  
* No Silent Failures: All errors logged at appropriate level  
* Provide error recovery mechanism.

  o   Automatic Recovery:

             

| Failure Type | Recovery Method | Max Attempts | Backoff |
| :---- | :---- | :---- | :---- |
| Queue message processing | Azure Queue retry | 5 | Exponential (1s, 2s, 4s, 8s, 16s) |
| Database transient errors | mssql connection retry | 3 | Exponential |
| Blob storage transient errors | Azure SDK retry | 3 | Exponential |
| Stale batch timeout | auditControl auto-fail | N/A | Detected every 5 min |

**Manual Recovery:** **1\. Reset Failed Batch:**

\-- Reset batch to PENDING for retry

UPDATE TOKEN\_MIGRATION\_BATCH

SET STATUS \= 'PENDING',

	PROCESS\_START\_TIME \= NULL,

	PROCESS\_END\_TIME \= NULL

WHERE BATCH\_ID \= '{batch-id}';

 

\-- Re-queue batch worker message

\-- (Use HTTP API or manually insert into batch-worker-queue)

1.  **Regenerate Output Files:**

         \# HTTP API trigger

       curl \-X GET "https://{function-app}.[azurewebsites.net/api/billing/generate?sourceId=V21\&fileId=V21.P.20240115.0001](http://azurewebsites.net/api/billing/generate?sourceId=V21&fileId=V21.P.20240115.0001)" \\

      \-H "x-functions-key: {function-key}"

 

* Provide inquiry into the logs.  
  Database Views for Error Analysis:  
  \-- VW\_MIGRATION\_ERRORS: Consolidated error view  
  CREATE VIEW VW\_MIGRATION\_ERRORS AS  
  SELECT  
    e.FILE\_ID, e.BATCH\_ID, e.MONERIS\_TOKEN, e.ENTITY\_ID,  
    e.ERROR\_CODE, e.ERROR\_MESSAGE, e.ERROR\_TYPE,  
    e.CREATED\_AT,  
    b.FILE\_NAME, b.SOURCE\_ID, b.STATUS as FILE\_STATUS  
  FROM MIGRATION\_ERROR\_DETAILS e  
  JOIN TOKEN\_MIGRATION\_BATCH b ON e.FILE\_ID \= b.FILE\_ID AND b.BATCH\_ID \= b.FILE\_ID;  
  \-- VW\_AUDIT\_ERRORS: Audit log errors only  
  CREATE VIEW VW\_AUDIT\_ERRORS AS  
  SELECT \* FROM TOKEN\_MIGRATION\_AUDIT\_LOG  
  WHERE LOG\_LEVEL \= 'ERROR'  
  ORDER BY CREATED\_AT DESC;

## **Application Monitoring Design**

       *\<\< In this DDD, specify the associated application monitoring requirements in this section*

           *Refer to Appendix H for sample monitoring requirements content.\>\>*

### **Detailed Solution**

Use the table below to detail the application monitoring design that was developed in conjunction with  the Enterprise Application Monitoring Team as listed in the Requirements Matrix, the conditions to test for, and the filtering and throttling (threshold) rules to apply.

Work with your Enterprise Application Monitoring Team to select the best solutions to use and identify and document any set-up specifications that are required.

| NF-R\# | Specific Non-Functional Requirement to Monitor | Condition(s) to Test For | Events to Filter Out | Thresholds to Apply |
| ----- | ----- | ----- | ----- | ----- |
| 1 | *\<\<Specific application monitoring item (matching the NFR \# listed in the Non-Functional tab of the Requirement Matrix) and potentially indicate if real or synthetic actions are involved. E.g., user interface – submit order inquiry action. Generate synthetic requests from a representative client machine.\>\>* | *\<\<Specify the type of application monitoring that is required. Some standard types of application monitoring include: availability (e.g., application component, process availability, URL availability);  performance (e.g., workflow execution time, CPU utilization, end-to-end user interface response time, transaction response time); and capacity (e.g. application file(s), file systems, messages per second, concurrent sessions) \>\>* | *\<\<Identify any subset of detected events that don’t need to be actioned. E.g., events out of full service hours or events from non-production environments\>\>* | *\<\<Provide any directions that reduce the number of the same events to respond to. E.g., respond to the first event within every 15 minute time period, or respond to every 3rd event\>\>* |
| 2 |   |   |   |   |

 

### **Existing Application Monitoring**

*Use the table below to specify any application monitoring that is currently done by or for the Enterprise Application Suite, and assess if any design or implementation changes are required.*

 

 

| NF-R \# | Application Monitoring Currently Done | Change Required? | Description of Change |
| ----- | ----- | ----- | ----- |
| 1 | *\<\<Identify any application “monitoring” that is currently done by or for the Enterprise Application Suite of Tools. E.g., HP Site Scope  (that runs every 10 minutes) that tests the availability and response time of several HTTP requests that it is dependent on.\>\>* | *\<\<Yes or No. E.g., Yes.\>\>* | *\<\<Describe the change that is in the current project scope or will be addressed in the future. E.g., Once the “providers” of the HTTP services that the application is dependent on have implemented suitable monitoring of those services that they provide, the application will stop executing this monitoring.\>\>* |
| 2 |   |   |   |

### **Correlation**

Use the table below to specify any event correlation rules to apply and describe the technical and business impact.

| NF-R \# | Event Relationship With Other Events | Event Impact | Event Type (Severity) |
| ----- | ----- | ----- | ----- |
| 1 | *\<\<Describe any relationships with lower and higher level events (normally associated with infrastructure or application components depended on, or applications dependent on, this application – as indicated in the Requirements Matrix). E.g., a provided web service not being available could be related to a back-end host function not being available, and could be related to a consuming application’s user interface action not being available.\>* | *\<\<Describe the impact of this event \- perhaps by qualifying an impact described in the HLD. E.g., functions / services that consume this web service will fail – including one required to submit a wireless service change order.\>\>* | *\<\<Fatal, Critical, Minor, Warning, or Informational. E.g., Critical.\>\>* |
| 2 |   |   |   |

### **Views, Dashboards and Reports**

The Views, Dashboards and Reports are instrumented in HP Business Service Management (BSM), and can provide the convergence between applications, systems and infrastructure monitoring applications, to provide a comprehensive end to end view.

A configuration items CI represents the monitored asset that is to be reported on.

 

| NF-R \# | What is needed to be reported on? | What CI? | Who requires access to report? | Frequency of the report execution? | Composite report Another CI to be included with this CI? |
| ----- | ----- | ----- | ----- | ----- | ----- |
| 1 |   | *\<\<E.g. V21\>\>* | *\<\<If required, identify who requires access to receive or view the report\>\>* | *\<\<E.g. 1 per day at 04:00 except weekends\>\>* | *\<\<E.g. MPS\>\>* |

### **Resolution**

Use the table below to specify any required automatic recovery and / or notification actions. Note that for “Fatal” or “Critical” events, an incident with an associated severity (1 and 2, respectively) will be automatically created.

| NF-R \# | Automatic Recovery Action | Notification Action |
| ----- | ----- | ----- |
| 1 | *\<\<If practical, identify what automatic recovery action to take. E.g., For a failed application process, restart the process.\>\>* | *\<\<If required, identify who to notify and how. E.g., notify the points of contact for the impacted application(s).\>\>* |
| 2 |   |   |

 

# **7 [Component Structure and Interfaces \-](https://reqcentral.com/wiki/pages/viewpage.action?pageId=970097561&spaceKey=PAYMOD&title=Detailed%2BDesign%2BDocument%2Bfor%2BProject%2BPayment%2BModernization%2B-%2BToken%2BMigration#DetailedDesignDocumentforProjectPaymentModernizationTokenMigration-ComponentStructureandInterfaces-PaymentHUB) WIN Online Media**

# 

# **Technical Solution**

 WIN Online Media  (Media Ebill) will create an encrypted CSV (comma separated values) file of existing credit card tokens to be sent to the Payment HUB (via EFT) for migration. PHUB will migrate the tokens to the Payment Gateway and return to WIN Online Media a output file with the Payment Method Reference (PMR) number which represents the credit card token.

 As a preliminary step to integration with Payment Gateway and Payment HUB, WIN Online Media will perform a migration of the stored Moneris credit card tokens.Approximately 13,000  tokens will include:

1. Active tokens – tokens with a valid expiry date  
2. Expired tokens – tokens that have expired, up to 3 years in the past

    **Migration Strategy**

| ACTIVITY | RELEASE | COMMENT |
| :---- | :---- | :---- |
| Generation of initial input file | R426 | Generation of encrypted input file to be sent to PHUB, containing tokens |
| Generation of delta input file | R526 | Generation of encrypted input file to set sent to PHUB, containing tokens created between the R426 and R526 releases (not sent in initial file) |
| Ingestion of output file | R526 | PHUB to generate encrypted output file to be sent to WIN Online. WIN Online to update system with PMR values. |

3.  

**A) Encryption Keys**  
 There will be 2 sets of keys used to encrypt/decrypt the request and response files between WIN Online and PHUB. The keys will follow the security approved protocol; AES256, RSA with 2048-bit key length (asymmetric key exchange algorithm).

1\) PHUB Keys \-  keys generated by PHUB. The public key will be shared to WIN Online to encrypt the input file that is sent to PHUB.

2\) WIN Online Keys – keys generated by WIN Online. The public key will be shared to PHUB to encrypt the output file that is to be sent to WIN Online Media. WIN Online Media will use the private key to decrypt the output file.

 **B) Input File from WIN Online Media to PHUB**

 A database job will be executed to extract the following information from MEDIA\_CCS table and create a CSV file. It is possible to have duplicate records in the file, with 2 different usage types; PHUB will handle duplicates accordingly.

 Input File Name:

 WINM.P.\<YYYYMMDD\>.\<4-DIGIT-SEQUENCE\>.input.gpg  
 Example: WINM.P.20260107.0001.input.gpg

 Header Field Names (first record):MONERIS\_TOKEN, EXP\_DATE, ENTITY\_ID, ENTITY\_TYPE, ENTITY\_STS, CREATION\_DATE, LAST\_USE\_DATE, TRX\_SEQ\_NO, BUSINESS\_UNIT

 Footer Row (last record):  
 TRANSACTION\_COUNT, TIMESTAMP

 TRANSACTION\_COUNT: 10 digit number representing the number of records in the file, with leading 0s.  
 Example: 0000123456  
 TIMESTAMP: YYYYMMDDHHmmSS  representing file generation timestamp  
 HH=hour in 24 hour format

 Input File (WIN Online Media to PHUB)

| FIELD | FIELD NAME | DATA FORMAT | DESCRIPTION |
| :---- | :---- | :---- | :---- |
| MONERIS\_TOKEN | Moneris Token | 16 digits starting with ‘9’ | Moneris token representing the credit card |
| EXP\_DATE | Expiry Date | MMYY | Expiration date of credit card |
| ENTITY\_ID | Entity ID | Alphanumeric | User GUID associated to credit card |
| ENTITY\_TYPE | Entity Type | Value \= 2 | Value ‘2’ represents GUID |
| ENTITY\_STS | Entity Status | Blank/empty for WIN Online Media |  |
| CREATION\_DATE | Creation Date | YYYYMMDD | Creation or last update date of the token |
| LAST\_USE\_DATE | Last Used Date | YYYYMMDD | Date that the token was last used for payment/refund |
| TRX\_SEQ\_NO | Transaction Sequence Number | Blank/empty for WIN Online Media |  |
| BUSINESS\_UNIT | Business Unit | Blank/empty for WIN Online Media |  |
| USAGE\_TYPE | 1 character: ‘**1’ \= ONETIME (CIT:customer initiated transaction) ‘2’ \= RECURRING (MIT: merchant initiated transaction)** ‘3’ \= INSTALLMENT ‘4’ \= UNSCHEDULE | Defines usage type | Mandatory; WIN Online Media to use either ‘1’ or ‘2’ For WIN Online, if token is used for both one-time and recurring, then send only 1 record for Recurring |

 The CSV file will be encrypted using PGP encryption, with the Payment Hub public key.The file will be picked up from WIN Online Media by EFT and delivered to Payment Hub.

 **C) Output File from PHUB to WIN Online Media**

 The Payment Hub will process the input file and return to WIN Online Media (via EFT) a output file containing only successfully migrated tokens. The output file from PHUB will be encrypted with the WIN Online Media public key. Upon receiving the PHUB output file, WIN Online Media will decrypt the file (with the private key) and process the output file. There will be only 1 PMR record per credit card token, regardless of the number of records sent in the input file.

 Output File Name:

 WINM.P.\<YYYYMMDD\>.\<4-DIGIT-SEQUENCE\>.output.gpg

 Example: WINM.P.20260107.0001.output.gpg

 Output File (PHUB to WIN Online Media)

| FIELD | FIELD NAME | DATA FORMAT | DESCRIPTION |
| :---- | :---- | :---- | :---- |
| MONERIS\_TOKEN | Moneris Token | 16 digits starting with ‘9’ | Moneris token representing the credit card |
| EXP\_DATE | Expiry Date | MMYY | Expiration date of credit card |
| ENTITY\_ID | Entity ID | Alphanumeric | User GUID associated to credit card |
| ENTITY\_REF\_TYPE | Entity Type | Value \= 2 | Value ‘2’ represents GUID |
| PMR | Payment Method Reference number | 16 digits, starting with ‘8’  | Note: PMR will not have last 4 digits of the credit card  |
| CARD\_BRAND | Card Brand | 1 character V=Visa M=Mastercard A=Amex |  |
| FIRST\_SIX | First 6 digits | 6 digits | First 6 digits of the card |
| LAST\_FOUR | Last 4 digits | 4 digits | Last 4 digits of the card |
| FUNDING\_METHOD | Functing Method Type | Enumeration: CHARGE CREDIT DEBIT UNKNOWN | Can be ignored by WIN Online Media |

 

The first row in the output file will be the header names:  
 MONERIS\_TOKEN,EXP\_DATE,ENTITY\_ID,ENTITY\_REF\_TYPE,PMR,CARD\_BRAND,FIRST\_SIX,LAST\_FOUR,FUNDING\_METHOD

The last record in the file will be the footer row:  
 TRANSACTION\_COUNT, TIMESTAMP  
 TRANSACTION\_COUNT: 10 digit number representing the number of records in the file, with leading 0s.  
 Example: 0000123456  
 TIMESTAMP: YYYYMMDDHHmmSS  representing file generation timestamp  
 HH=hour in 24 hour format

 A database job will update the MEDIA\_CCS table, adding the PMR number in a new column in the table (“PMR”). The PMR value will be used in the future for credit card payments, instead of the Moneris token.

 **D) EFT File Transfer**

 WIN Online Media already has an integration with EFT. Below are the Production and QA environment details for EFT file transfer to and from PHUB.

 WIN Online Media transfer to Payment HUB

|  | PROD Env | QA/Testing Env |
| :---- | :---- | :---- |
| Source Application/Vendor Name | WIN Online | WIN Online |
| Server IP/host name | VLRENBPRWINLO01 | VLRENBQ2WINLO01 |
| Account ID for MFT to log in the server | mftusr | qa2load |
| File description | Payment modernization token migration input file (billing system to PHUB) |  |
| File name convention | WINM.P.\<YYYYMMDD\>.\<4-DIGIT-SEQUENCE\>.input.gpg Example: WINM.P.20260107.0001.input.gpg |  |
| Is fin file to be used? Fin file is a zero size file to indicate the data file is ready to be transferred. | Yes, fin file to be created by WIN Online |  |
| Directory for MFT to pick up the file | /COBRA/MFT/TokenMigration | /app/domains/qa2load/LOADER\_env19/COBRA/MFT/TokenMigration |
| Backup the file?  If yes, provide backup directory, MFT will move the file to backup directory; if no, by default, MFT will delete the file after the file is transferred. | /COBRA/MFT/TokenMigration/backup | /app/domains/qa2load/LOADER\_env19/COBRA/MFT/TokenMigration/backup |
| How often the file to be transferred? | By request |  |

 Payment HUB transfer to WIN Online Media

|  | PROD Env | QA/Testing Env |
| :---- | :---- | :---- |
| Source Application/Vendor Name | WIN Online | WIN Online |
| Server IP/host name | VLRENBPRWINLO01 | VLRENBQ2WINLO01 |
| Account ID for MFT to log in the server | mftusr | qa2load |
| File description | Payment modernization token migration output file (PHUB to billing system) |  |
| File name convention | WINM.P.\<YYYYMMDD\>.\<SEQUENCE\>.output.gpg Example: WINM.P.20260107.0001.output.gpg |  |
| Directory for MFT to deliver file to | /COBRA/MFT/MediaFiles/TokenMigration | /app/domains/qa2load/LOADER\_env19/COBRA/MFT/MediaFiles/TokenMigration |

 Additional Notes:

* The database job will perform the same exercise for the delta credit card token migration (1 month after initial file creation).  
* WIN Online Media will be able to support the re-generation of the input file, with the same file name and sequence number, if required by PHUB.  
* Token used by payments sent to WIN Online Media from Cash for ECA payments will not be included in the input files.

## **7.1 TSC**

## **Technical Solution**

From the implementation perspective, TSC will create a console application to send the file for the migration purpose, that console application will read ESM table then generate the migration file in the required format, and same will be applicable to web table as well.

The file that TSC send to the team will be encrypted and the output file which TSC receive will be encrypted as well. So TSC has to decrypt it but encrypt the file before sending it.

TSC need to encrypt the file and then upload to EFT server. TSC will do how the upload would be through public SSH, but we need EFT information from EFT team for example where we should be pushing the file, we need the whole path and connection details. 

We need to know what P hub is returning for example file formats etc. We know that we will send them two files but when we will receive the file, will it be encrypted file?

**A)** **Tables**

| Web Tables     |  |
| ----- | :---- |
| **CUSTOMER\_CC**  | Card on file |
| **CART\_CC**     | Card on cart |

####  

| ESM Tables     |  |
| ----- | :---- |
| **CUSTXREF\_CC**  | Card on file \- Usage Type \- One time Payment |
| **ORDERACTIONS**  | OACC record for CC type \- Purchase Tokens of the last two years \- Usage Type \-  One time Payment |
| **STANDINGHEADER** | For Standing orders : one CC per customer \- Installments Token \-Usage Type \- Installments |

####  

| Table Creation |  | Credit Card Details Required |  |  |  |  |  |  |
| ----- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Create DB table in **ESM** with all required CC |  | Token | Expiry Date |  | Card Type |  | Last Four Digit |  PMR |
| Create DB table in **Web** with all active CC  |  | Token | Expiry Date |  | Card Type |  | Last Four Digit |  PMR |
| **Create Console application to send file** |  |  |  |  |  |  |  |  |
| **ESM** | Read ESM table | Generate migration file in required format |  | Encrypt the file |  | Upload to EFT server using public SSH |  |  |
| **WEB** | Read Web table | Generate migration file in required format |  | Encrypt the file |  | Upload to EFT server using public SSH |  |  |
|  |  |  |  |  |  |  |  |  |

**Request File Name:** 

#### **TSC will send two files, one is for ESM and another is for web**

**1\) TSC1 \-  ESM** 

 **2\) TSC7 \-  web**

**TSC7**

TSC7.P\<YYYYMMDD\>.\<4-DIGIT-SEQUENCE\>.input.pgp Example: TSC7.P.20260110.0001.input.pgp

**TSC1**

TSC1.P\<YYYYMMDD\>.\<4-DIGIT-SEQUENCE\>.input.pgp Example: TSC1.P.20260110.0001.input.pgp

Header Field Names (first record):MONERIS\_TOKEN, EXP\_DATE, ENTITY\_ID, ENTITY\_TYPE, ENTITY\_STS, CREATION\_DATE, LAST\_USE\_DATE, TRX\_SEQ\_NO, BUSINESS\_UNIT

 Footer Row (last record):TRANSACTION\_COUNT: 10 digit number representing the number of records in the file, with leading 0s.  
 Example: 0000123456  
 TIMESTAMP: YYYYMMDDHHmmSS  representing file generation timestamp  
 HH=hour in 24 hour format

Output file \- Review the file format 

As TSC will be sending the migration files. No one is going to extract from TSC side, we are going to push it based on the format.

**B)  Request file from TSC to PHUB**

| Field Name | Format | Description | ESM/Web/Salesforce |
| :---- | :---- | :---- | :---- |
| **MONERIS\_TOKEN** | 16 digits, starting with 9 | Moneris token | **ESM/Web/Salesforce \-** 16-digit token that would come from customer extra CC table |
| **EXP\_DATE** | MMYY | Expiration date of Moneris token. May be expired | **ESM/Web/Salesforce \-** Expiry date of the card Note: By January Jignasa will decrypt the data for web/salesforce to get expiry date |
| **ENTITY\_ID** | Up to 36 alphanumeric characters | Entity (or account), to which payment method is linked, | **ESM/Web/Salesforce \-** Customer EDPs – Upto 10 digits EDP |
| **ENTITY\_TYPE** | ‘1’ for Account Number | Account number  | **ESM/Web/Salesforce \-** TSC will use '1' |
| **ENTITY\_STS** | 1 character: | Entity (or account) status. | **ESM/Web/Salesforce –** “Open” |
| **CREATION\_DATE** | YYYYMMDD | Creation or last update date of the token. For cleanup.   | **ESM/Web/Salesforce –**  TSC doesn't capture. TSC will send empty |
| **LAST\_USE\_DATE** | YYYYMMDD | Last use date of the token. For cleanup. | **ESM/Web/Salesforce –** TSC will send empty |
| **TRX\_SEQ\_NO** |  | N/A for this type of file. Should be left empty | TSC will send empty |
| **BUSINESS\_UNIT** |  | Not applicable for bulk migration, should be left empty | TSC will send empty  |
| **USAGE\_TYPE** | 1 character: ‘1’ – ONETIME ‘2’ – RECURRING ‘3’ – INSTALLMENT ‘4’ – UNSCHEDULE | Defines usage type of usage. | **ESM/Web/Salesforce –** 1’ – ONETIME \- For cards on file ‘2’ – RECURRING \- For cards used for auto delivery program ‘3’ – INSTALLMENT \- For cards used for installments |

 

**File name/format \-** 

**C) Response File from PHUB to TSC**

TSC will not receive any output file for production in phase 1, however it is configurable, but TSC would like to have a section where a QA environment or QA related stuff is documented because we need that output file for phase 2\.

Also, only one file will be generated for TC1 & TC7. 

 

**D) EFT File Transfer**

 

**TSC to push migration request files to EFT Server**

|  | PROD Env | QA/Testing Env |
| :---- | :---- | :---- |
| Source Application/Vendor Name | TSC | TSC |
| Server IP/host name | VLRENBPRWINLO01 | VLRENBQ2WINLO01 |
| Account ID for MFT to log in the server | mftusr | qa2load |
| File description | Payment modernization token migration input file (billing system to PHUB) |  |
| File name convention | **TSC7** TSC7.P\<YYYYMMDD\>.\<4-DIGIT-SEQUENCE\>.input.pgp Example: TSC7.P.20260110.0001.input.pgp **TSC1** TSC1.P\<YYYYMMDD\>.\<4-DIGIT-SEQUENCE\>.input.pgp Example: TSC1.P.20260110.0001.input.pgp |  |
| Is fin file to be used? Fin file is a zero size file to indicate the data file is ready to be transferred. | Yes, fin file to be created by TSC |  |
| Directory for MFT to pick up the file | /COBRA/MFT/TokenMigration | /app/domains/qa2load/LOADER\_env19/COBRA/MFT/TokenMigration |
| Backup the file?  If yes, provide backup directory, MFT will move the file to backup directory; if no, by default, MFT will delete the file after the file is transferred. | /COBRA/MFT/TokenMigration/backup | /app/domains/qa2load/LOADER\_env19/COBRA/MFT/TokenMigration/backup |
| How often the file to be transferred? | By request |  |

 **TSC to pull migration response files from EFT Server**

|  | PROD Env | QA/Testing Env |
| :---- | :---- | :---- |
| Source Application/Vendor Name | TSC | TSC |
| Server IP/host name | VLRENBPRWINLO01 | VLRENBQ2WINLO01 |
| Account ID for MFT to log in the server | mftusr | qa2load |
| File description | Payment modernization token migration output file (PHUB to billing system) |  |
| File name convention |  |  |
| Directory for MFT to deliver file to | /COBRA/MFT/MediaFiles/TokenMigration | /app/domains/qa2load/LOADER\_env19/COBRA/MFT/MediaFiles/TokenMigration |

 

**Create Console application to receive file**

#### **Connect to EFT server, download file, (decryption needed?)**

#### **Read the file and update ESM/Web table with PMR info**

# **Logical Data Architecture/Model**

This section of the document now precedes the Information Subject Areas. With the visual representation of the subject areas illustrated in the Logical Data Architecture

To maintain consistency in the practices associated with gathering business requirements the reference to the Logical Data Architecture may contain information that provides a conceptual view or it may contain a more detailed logical view that can be easily transformed into a physical data model. The description will be based solely on available information.

 

Define the logical data model describing the tables and their cardinality relationship only for this sub system.

       	*\<\< Refer to Appendix F for a sample\>\>*

## **Database Configuration**

Highlight any changes that need to be considered in the configuration of the database. Although not an all-inclusive list, the following can be considered as candidate areas for discussion:

* Optimization Rules (cost versus rules)  
* Compatibility options  
* Language support  
* Cursor management  
* Auditing  
* Schema changes

 

## **Table Changes**

Highlight all table changes that need to be considered:

 

| Table Name | New or Modified | Property Description | Product/Sku Level | Mandatory Property (Yes/No) | Boolean (Yes/No) | Exportable    (Yes/No) | Rationale for Modification |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
|   |  |  |  |  |  |  |  |
|   |  |  |  |  |  |  |  |
|   |  |  |  |  |  |  |  |

*Consider if new tables should be added to the “Quick-Select” configuration file as part of this project (consult with DBA for more details)*

                                                                                                              

# **Infrastructure Solution**

Identification of infrastructure solution that will directly impact design and implementation of the system

## **Hardware**

## **Software**

## **Network**

## **Installation Procedures**

## **Back-up Procedures**

## **Operational Instructions**

## **Release Notes**

## **Implication of Solution**

## **Performance Testing**

| Performance Testing | Status (Yes/No) | Note |
| ----- | ----- | ----- |
| Completed Performance Assessment |   |   |
| Performance Testing is required |   |   |

## **Service Level**

## **Infrastructure Monitoring Design**

*\<\<Work with your Enterprise Systems Management group contact to select the best monitoring solutions to use and identify and document any set-up specifications that are required. \>\>*

***\<\<Refer to Appendix H for sample monitoring design content.\>\>***

*\<\<Use the table below to specify any requirements related to infrastructure monitoring that are currently done by or for the application platform, and assess if any design or implementation changes are required.\>\>*

| NF-R \# | Monitoring Currently Done | Change Required? | Description of Change |
| ----- | ----- | ----- | ----- |
| 1 | *\<\<Identify any Infrastructure “monitoring” that is currently done by or for the infrastructure platform. E.g., the application has a Perl script (that runs every 10 minutes) that tests the availability the physical platforms that it is dependent on.\>\>* | *\<\<Yes or No. E.g., Yes.\>\>* | *\<\<Describe the change that is in the current project scope or will be addressed in the future. E.g., There is an additional need to monitor the physical memory available to the platform and will be instrumented through a Tivoli request.\>\>* |
| 2 |   |   |   |

 

*\<\<Use the table below to specify the infrastructure monitoring solution(s) that will be used to meet the monitoring requirements, and any additional information that may be required to set up the selected monitoring solution(s).\>\>*

| NF-R \# | Solution(s) to Use to Meet the Specific Element Monitoring Requirement | Existing or New Solution | Additional Set-up Information Required |
| ----- | ----- | ----- | ----- |
| 1 | *\<\<Tool and or process to use. E.g., Tivoli Enterprise Console (TEC) log file adapter to monitor for a specific application log file error message.\>\>* | *\<\<Existing or New. E.g., Existing.\>\>* | *\<\<Additional Set-up Information Required. E.g., log file message pattern to scan for – “ABC9999E”.\>\>* |
| 2 |   |   |   |

##  **Business Continuity/Disaster Recovery**

* Disaster Recovery

This section must ALWAYS include the specific technical details of the DR capability for the application(s):

DR SOLUTION OVERVIEW

| NF-R \# | Existing DR capability | Change Required? | Description of Change |
| ----- | ----- | ----- | ----- |
| 1 | Identify Recovery Time Objective (RTO): \_\_\_\_ The target time upon invoking the DR Plan within which the IT service will be brought up at the alternate site. Vital: Indicate a value between 15 min – 24 hrs (default is 24 hours) Critical: Indicate a value between 25 hrs – 96 hours (default is 96 hours) Recovery Point Objective (RPO): \_\_\_\_ |   | *If value for recovery objective is changing, identify new value.* |
| 2 | Identify Recovery Point Objective (RPO): \_\_\_\_ The maximum amount of data the business can lose for the IT Service) Vital/Critical: Indicate a valued between 0-24 hours    	(default is 24 hours) |   | *If value for recovery objective is changing, identify new value.* |
| 3 | Recovery/Failover method: Automatic Manual Intervention required   | *\<\<Yes or No. E.g., Yes.\>\>* | *\<\<Describe the change that is in the current project scope or will be addressed in the future. E.g., There is an additional need to monitor the physical memory available to the platform and will be instrumented through a Tivoli request.\>\>* |
| 4 | Data Recovery method: Data Replication   Specify type of replication \- e.g. Global Mirroring, DataGard,etc: \_\_\_\_\_\_\_\_\_ Restore from backup Rebuild |   | If data recovery method is changing, specify details of change |
| 5 | RETURN-TO-NORMAL/Failback method Automatic Manual Intervention required Provide brief description of how return-to-normal/failback method: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ |   |   |
| 6 | DR EXERCISE ISOLATION REQUIREMENTS for DR Exercise participation Describe details of existing DR Isolation process for this app (include VLAN details) \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ |  | Describe changes to how DR isolcation will need to be done for this new solution. |

 

DR SERVERS AND TOOLS

| NF-R \# | Existing DR Component Layer | Server info *(servername-IP address-VIP-dns info)* | Change Required? | Description of Change |
| ----- | ----- | ----- | ----- | ----- |
| 1 | Front-End Layer |     |   |   |
| 2 | Middleware |     |   |   |
| 3 | Backend layer |     |   |   |
| 4 | Database Layer |     |   |   |
| 5 | Other layer(s): specify |     |   |   |

 

 PRE-REQUISITE/UPSTREAM APPLICATIONS

Please identify all the pre-requisite applications – i.e. applications that **WILL** impact- the functionality of this this application.  (Impact Severity Levels: Red (R ) \= App is Down;   Yellow (Y) \= App is degraded;   **Orange (O)** \= App is Partially degraded;  Green (G)\= App is available)

 

| NF-R \# | PRE-REQUISITE/UPSTREAM APPLICATION Name | AppID | EXISTING/NEW UPSTREAN (identify if this is an existing dependency or a new dependency) | Describe existing dependency (include specific interface/endpoinnt/channnels, etc info) | Impact to application if Upstream is unavailable |  |  |  | Change Required? | Description of Change |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
|  |  |  |  |  | **R** | **Y** | **O** | **G** |  |  |
| 1 |   |   |   |   |   |  |  |  |   | *a) 	Change dependency? i.e. is dependency being removed?   b) 	Change in dependency details? e.g. change in endpoint?   c)  	Change in impact to application? e.g change from yellowto red if upstream is not available? *        |
| 2 |   |   |   |   |   |  |  |  |   |   |
| 3 |   |   |   |   |   |  |  |  |   |   |
| 4 |   |   |   |   |   |  |  |  |   |   |
| 5 |   |   |   |   |   |  |  |  |   |   |
|  |  |  |  |  |  |  |  |  |  |  |

 

 

DEPENDENT/UPSTREAM APPLICATIONS

| NF-R \# | DEPENDENT/DOWNSTREAM APPLICATION Name | AppID | EXISTING/NEW DOWNSTREAM (identify if this is an existing dependency or a new dependency) | Describe existing dependency (include specific interface/endpoinnt/channnels, etc info) | Impact to application if Downsteam is unavailable |  |  |  | Change Required? | Description of Change |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
|  |  |  |  |  | **R** | **Y** | **O** | **G** |  |  |
| 1 |   |   |   |   |   |  |  |  |   | *a) 	Change dependency? i.e. is dependency being removed?   b) 	Change in dependency details? e.g. change in endpoint?   c)  	Change in impact to application? e.g change from yellowto red if upstream is not available? *        |
| 2 |   |   |   |   |   |  |  |  |   |   |
| 3 |   |   |   |   |   |  |  |  |   |   |
| 4 |   |   |   |   |   |  |  |  |   |   |
| 5 |   |   |   |   |   |  |  |  |   |   |
|  |  |  |  |  |  |  |  |  |  |  |

 

# **Screenshots/Wireframes/ Reports**

## **Define the screen shots if applicable**

## **Reports**

The component addresses the various aspects of reporting that need to be addressed:

* Add hoc Reports  
* Scheduled reports  
* Delivery mechanism  
* Formats  
* Scheduling  
* Retention (how long do you want to keep the reports?)  
* Multi Language support  
* Define error handling

# **Location/Summary of Changes**

* The For each of the functions / components describe the following:  
* The name and kind (such as COBOL, JCL, Unix Scripts, JSP, ASP, COM, Servlets, Java beans, Web Services, ALSB, WLI, etc.) of the files that implement the functions.  
* For enhancement projects this represents the files that are being modified to implement the function.  
* A description of the functionality or the change to the functionality that is being implemented.  
* For each file identify the closure dependencies.

 

***\<\<Refer to Appendices G for a sample\>\>***

# **IT Compliance**

The IT compliance requirements were determined in the following PMO/SDLC documents: Requirements Matrix and HLD. The objective of this paragraph is to provide the solution details to meet the IT compliance requirements related to the Rogers Architecture Framework (RAF), Corporate Information Security (CIS) Standards, and Operational Framework.  Depending on the selection made in the Requirements Matrix and HLD, identify the applicable requirements below and provide the solution details

Provides several views of the solution architecture from a data point of view.

## **Solution Design Conformance**

*\<\<Ensure the conformance to Rogers Architecture and Design Standards by completing an Application Design Checklist for each new or impacted application. The Application Design Checklist will be used to record an application design’s conformance to best practices and standards that originate from the Rogers Architecture Group. The checklist contains the expected standards that Architecture and Delivery teams must abide by in their designs. The Application Design Checklists should be included in the HLD as attachments.\>\>*

Please note that Application ID and Application Category are mandatory fields. If you do not remember App ID for an application, please refer to the existing [Application Catalogue](https://rcirogers.sharepoint.com/sites/itsgovernance/Shared%20Documents/Forms/AllItems.aspx?RootFolder=%2Fsites%2Fitsgovernance%2FShared%20Documents%2FITIL%20Applications%20and%20Services%20Catalogue).

For projects concerning net new applications please submit a [request](https://rogers2.service-now.com/itportal/view_content.do?sysparm_sys_id=?v=1&uri=com.glideapp.servicecatalog_cat_item_view.do%3Fv%3D1%26sysparm_id%3Dc4444376db45330094945068dc96194a%26sysparm_link_parent%3Dc96ac233db55038043fc591e5e961919%26sysparm_catalog%3De0d08b13c3330100c8b837659bba8fb4&sysparm_document_key=sc_cat_item,c4444376db45330094945068dc96194a) to get an Application ID.

| Application Id | Application Name | [Application Classification](https://rcirogers.sharepoint.com/:p:/r/sites/ITS-Projects/Guidlines_Wiki/Documents/Templates/SDLC/Application%20Classification%20definitions.pptx?d=wa5774ecc6ce04572b234b8575e1d8804&csf=1&web=1&e=1MEcIX) (V/C/I/P) | Application Design Checklist Required (Y/N)? |
| ----- | ----- | ----- | ----- |
|   |   |  |   |
|   |   |  |   |
|   |   |  |   |
|   |   |  |   |
|   |   |  |   |
|   |   |  |   |

## **Security**

*\<\<Ensure compliance to Rogers CIS Policies and Standards Framework that includes PCI and SOX regulations and PIPEDA legislation. Depending on the selection made in the Requirements Matrix and thereafter the HLD, indicate the security requirements and provide the solution details. Where possible, refer to sections in the document that addresses the requirement. For a reference on the level of detail required, refer to Appendix I\>\>*

|  Category/Domain | Requirement | Detailed Design |
| ----- | ----- | ----- |
| **Identity and Access Management**   |   | *\<\<Describe details of the solution design to meet the security requirements.\>\>*   |
| **Protection of Data**   |   | *\<\<Describe details of the solution design to meet the security requirements.\>\>* |
| **Availability**   |   | *\<\<Describe details of the solution design to meet the security requirements\>.\>* |
| **Logging, Detection, and Response**   |   | *\<\<Describe details of the solution design to meet the security requirements.\>\>* |
| **Network Security**   |   | *\<\<Describe details of the solution design to meet the security requirements.\>\>* |
| **System Build and Management**   |   | *\<\<Describe details of solution design to meet the security requirements.\>\>* |
| **Systems Development**   |   | *\<\<Describe details of the solution design to meet the security requirements\>.\>* |
| **Encryption**   |   | *\<\<Describe details of the solution design to meet the security requirements.\>\>* |
| **Physical Security**   |   | *\<\<Describe details of the solution design to meet the security requirements.\>\>* |

### **MLOS Risk Management/Standards Exception**

*\<\<Any MLOS Technical Design requirement that was deemed in-scope of the project but is not part of the detailed design within the DDD must have an approved CIS exception.* 

*For further details, please contact CIS at infosec@rci.rogers.com or visit CIS on Rogers Zone [Corporate Information Security Website](http://www.rogerszone.com/departments/ITS/lang/En/Pages/Information%20Security.aspx). \>\>*

 

| Request Number | Status (Approved / Pending) | Risk Rating | Issue Name/Descriptor |
| ----- | ----- | ----- | ----- |
|   |   |   |   |
|   |   |   |   |
|   |   |   |   |
|   |   |   |   |
|   |   |   |   |

 

# **Enterprise Application Monitoring Design**

*\<\< In this DDD, specify the associated application monitoring requirements in this section*

*Refer to Appendix H for sample monitoring requirements content.\>\>*

## **Detailed Solution**

Use the table below to detail the application monitoring design that was developed in conjunction with  the Enterprise Application Monitoring Team as listed in the Requirements Matrix, the conditions to test for, and the filtering and throttling (threshold) rules to apply.

| NF-R\# | Specific Non-Functional Requirement to Monitor | Condition(s) to Test For | Events to Filter Out | Thresholds to Apply |
| ----- | ----- | ----- | ----- | ----- |
| 1 | *\<\<Specific application monitoring item (matching the NFR \# listed in the Non-Functional tab of the Requirement Matrix) and potentially indicate if real or synthetic actions are involved. E.g., user interface – submit order inquiry action. Generate synthetic requests from a representative client machine.\>\>* | *\<\<Specify the type of application monitoring that is required. Some standard types of application monitoring include: availability (e.g., application component, process availability, URL availability);  performance (e.g., workflow execution time, CPU utilization, end-to-end user interface response time, transaction response time); and capacity (e.g. application file(s), file systems, messages per second, concurrent sessions) \>\>* | *\<\<Identify any subset of detected events that don’t need to be actioned. E.g., events out of full service hours or events from non-production environments\>\>* | *\<\<Provide any directions that reduce the number of the same events to respond to. E.g., respond to the first event within every 15 minute time period, or respond to every 3rd event\>\>* |
| 2 |   |   |   |   |

 

## **Existing Application Monitoring**

*Use the table below to specify any application monitoring that is currently done by or for the Enterprise Application Suite, and assess if any design or implementation changes are required.*

 

| NF-R \# | Application Monitoring Currently Done | Change Required? | Description of Change |
| ----- | ----- | ----- | ----- |
| 1 | *\<\<Identify any application “monitoring” that is currently done by or for the Enterprise Application Suite of Tools. E.g., HP Site Scope  (that runs every 10 minutes) that tests the availability and response time of several HTTP requests that it is dependent on.\>\>* | *\<\<Yes or No. E.g., Yes.\>\>* | *\<\<Describe the change that is in the current project scope or will be addressed in the future. E.g., Once the “providers” of the HTTP services that the application is dependent on have implemented suitable monitoring of those services that they provide, the application will stop executing this monitoring.\>\>* |
| 2 |  |  |  |

## **Correlation**

Use the table below to specify any event correlation rules to apply and describe the technical and business impact.

| NF-R \# | Event Relationship With Other Events | Event Impact | Event Type (Severity) |
| ----- | ----- | ----- | ----- |
| 1 | *\<\<Describe any relationships with lower and higher level events (normally associated with infrastructure or application components depended on, or applications dependent on, this application – as indicated in the Requirements Matrix). E.g., a provided web service not being available could be related to a back-end host function not being available, and could be related to a consuming application’s user interface action not being available.\>* | *\<\<Describe the impact of this event \- perhaps by qualifying an impact described in the HLD. E.g., functions / services that consume this web service will fail – including one required to submit a wireless service change order.\>\>* | *\<\<Fatal, Critical, Minor, Warning, or Informational. E.g., Critical.\>\>* |
| 2 |   |   |   |

### **Views, Dashboards and Reports**

The Views, Dashboards and Reports are instrumented in HP Business Service Management (BSM), and can provide the convergence between applications, systems and infrastructure monitoring applications, to provide a comprehensive end to end view.

A configuration items CI represents the monitored asset that is to be reported on.

 

| NF-R \# | What is needed to be reported on? | What CI? | Who requires access to report? | Frequency of the report execution? | Composite report Another CI to be included with this CI? |
| ----- | ----- | ----- | ----- | ----- | ----- |
| 1 |   | *\<\<E.g. V21\>\>* | *\<\<If required, identify who requires access to receive or view the report\>\>* | *\<\<E.g. 1 per day at 04:00 except weekends\>\>* | *\<\<E.g. MPS\>\>* |

### **11.3.2 Resolution**

Use the table below to specify any required automatic recovery and / or notification actions. Note that for “Fatal” or “Critical” events, an incident with an associated severity (1 and 2, respectively) will be automatically created.

| NF-R \# | Automatic Recovery Action | Notification Action |
| ----- | ----- | ----- |
| 1 | *\<\<If practical, identify what automatic recovery action to take. E.g., For a failed application process, restart the process.\>\>* | *\<\<If required, identify who to notify and how. E.g., notify the points of contact for the impacted application(s).\>\>* |
| 2 |  |  |

 

 

 

# **Appendix A – Sample Process Flow – Sequence Diagrams**

 

 

 

 

 

 

Appendix B – Sample Process Flow

 

 

 

 

 

Appendix C – Sample Component Structure and Interfaces

 

 

 

 

 

# **Appendix D – Sample Class Diagrams**

 

 

 

 

 

# **Appendix E – Sample Component Structure and Interfaces – GUI Components**

 

 

 

 

 

 

# **Appendix F – Sample Logical/ Physical Data Model**

 

 

 

 

 

# **Appendix G – Sample of Location/Summary of Changes**

## **UI Components:**

| UI Component File | Description |  |
| ----- | ----- | ----- |
| Openaccount.jsp | Description of the functionality   |  |
| CloseAccount.jsp | Description of the functionality |  |
| Java Bean |  | Description |
| OpenBean.java CloseDetailBean.java |  | Description of the functionality   |
|  |  |  |

## **12.2         Business Components/Web Services:**

| Servlets | Description |  |
| ----- | ----- | :---- |
| MobileCloseController.java | Description of the functionality |  |
| EJB | Description |  |
| MobileClose.java | Description of the functionality |  |

# **Appendix H – Sample of Operational Monitoring Content**

## **Monitoring Requirements**

### **Application Monitoring**

| NF-R\# | Specific Element Item to Monitor | Condition(s) to Test For | Events to Filter Out | Thresholds to Apply |
| ----- | ----- | ----- | ----- | ----- |
| 1 | User interface – submit order inquiry action. Generate synthetic requests from a representative client machine. | Test for user interface response times \> 3 seconds, every 5 minutes. | Events out of full service hours or events from non-production environments. | Respond to the first event within every 15 minute time period.   |
| 2 | External URL – “[http://hostname/url](http://hostname/url)”. Generate synthetic requests from representative browser types and external locations. | Test for response times \> 15 seconds, every 10 minutes. | Events out of full service hours or events from non-production environments. | None. Respond to every event. |
| 3 | J2EE – Java Message Service (JMS) queue – “ABC Prod Q name”. | Test for more than 100 messages in the JMS queue. | Events during weekly batch processing periods.   | Send an initial event when \> 100 messages. Only send additional events for every increment of 50 after that – i.e., 150, 200, etc. |
| 4 | Logfile – shared application server logfile \- “XYZ log”  | Database connection failure log message – “ABC9999E”. | None. | None. Respond to every event. |

### **Correlation**

| NF-R\# | Event Relationship With Other Events | Event Impact | Event Type (Severity) |
| ----- | ----- | ----- | ----- |
| 1 | Lower level events associated with the xyz back-end server could cause this event. This isn’t related to any other defined higher level technical events.   | Call centre agents and other client facing users will not be able to respond to customer order status inquiries. | Critical |
| 2 | Lower level events associated with the supporting web, application, or database servers could cause this event.  This isn’t related to any other defined higher level technical events. | Customer information will not be able to be validated, so customers will not be able to submit change orders via the [Rogers.com](http://rogers.com/) website. | Fatal |
| 3 | Lower level events associated with the EJB that processes the requests on this queue could cause this event. Higher level transaction response time events could be triggered by this event. | This application’s transactions will take longer to process and the risk of unacceptable response times and a potential failure is higher. | Warning |
| 4 | Lower level events associated with database z could cause this event. Many higher level events associated with functions or services dependent on the database data will be caused by this event. | Users and applications dependent on the impacted application x functions / services will not be available. | Fatal |

### **Reports, Dashboards and Views**

| NF-R \# | What is needed to be reported on? | What CI? | Who requires access to report? | Frequency of the report execution? | Composite report Another CI to be included with this CI? |
| ----- | ----- | ----- | ----- | ----- | ----- |
| 1 | *Report on the application latency for transactions.* | *MPS\`* | *John Smith* | *1 per day at 04:00 except weekends* | *None* |

### **Resolution**

| Req \# | Automatic Recovery Action | Notification Action |
| ----- | ----- | ----- |
| 1 | None. | Notify the ROCC via the Tivoli Enterprise Console (TEC). Create a severity 2 incident. |
| 2 | None. | Notify the ROCC via the Tivoli Enterprise Console (TEC). Create a severity 1 incident. |
| 3 | Consider activating more threads in the thread pool used by the JMS request ‘provider’. | Notify the ROCC via the Tivoli Enterprise Console (TEC). Provide operator directions for querying and changing the thread pool count. Don’t open an incident. |
| 4 | Consider increasing the size of the database connection pool. | Notify the ROCC via the Tivoli Enterprise Console (TEC). Create a severity 1 incident. |

## **Operational Monitoring Design**

| NF-R\# | Monitoring Currently Done | Change Required? | Description of Change |
| ----- | ----- | ----- | ----- |
| 1 | None. | No | N/A |
| 2 | External monitoring service provider A is used to capture response time measurements and make standard reports available. | Yes | When contract terms enable it, switch to Rogers’ preferred external monitoring service provider B to realize better cost savings and better event management integration. |
| 3 | None. | No | N/A |
| 4 | Currently the application code sends an e-mail notification to the primary and backup application support ids. | Yes | Once the new logfile monitoring solution is implemented, remove the application initiated e-mail notification. |

 

| NF-R\# | Solution(s) to Use to Meet the Specific Element Monitoring Requirement | Existing or New Solution | Additional Set-up Information Required |
| ----- | ----- | ----- | ----- |
| 1 | TBD | New |   |
| 2 | External monitoring service provider B | Existing | Geographic regions and network connection bandwidths to monitor from. |
| 3 | TBD | New |   |
| 4 | Tivoli Enterprise Console (TEC) logfile adapter. | Existing | Logfile message pattern to scan for – “ABC9999E”. |

# **Appendix I – Sample of Security requirements details**

Example requirements from Payment Card Industry (PCI)

| Category/Domain | Requirement \# | Requirement Description | Detailed Design |
| ----- | ----- | ----- | ----- |
|   | NF-R1 | Install and maintain a firewall configuration to protect cardholder data | *\<\<Describe how this detailed design protects unauthorized access from the Internet.  If the design relies on existing configurations please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   | NF-R2 | Do not use vendor-supplied defaults for system passwords and other security parameters | *\<\<Describe how this detailed design use secure system configurations.  If the design relies on existing configurations please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   | NF-R3 | Protect stored cardholder data | *\<\<Encryption is a critical component of cardholder data protection.  Describe how this detailed design addresses also data retention and disposal.  Do not store cardholder data unless absolutely necessary and where possible mask and make it unreadable.  If this design relies on existing procedures or processes please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   | NF-R | Encrypt transmission  of cardholder data across open, public networks | *\<\<Describe how this detailed design addresses encryption and transmission of card holder data.  If this design relies on existing procedures or processes please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   |   | Use and regularly update anti-virus software | *\<\<Describe how this detailed design addresses the prevention of malicious code.  If this design relies on existing procedures or processes please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   |   | Develop and maintain secure systems and applications | *\<\<Describe how this detailed design addresses the need to ensure systems and applications are patched and they are developed by using standard development processes and secure coding techniques.  If this design relies on existing procedures or processes please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   |   | Restrict access to cardholder data by business need-to-know | *\<\<Describe how this detailed design ensures that restricted data can only be accessed by authorized personnel.  If this design relies on existing procedures or processes please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   |   | Assign a unique ID to each person with computer access | *\<\<Describe how this detailed design ensures that actions taken on restricted data and systems are performed by, and can be traced to, known and authorized users.  If this design relies on existing procedures or processes please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   |   | Restrict physical access to cardholder data | *\<\<Describe how this detailed design restricts physical access to restricted data.  If this design relies on existing procedures or processes please state this.  Where possible, refer to section numbers in this document that address this requirement\>\>* |
|   |   | Track and monitor all access to network resources and cardholder data | *\<\<Describe how this detailed design includes logging mechanisms and the ability to track user activities.  This includes clock synchronization, backup, retention of log files and restricted access to log files.  If this design relies on existing procedures or processes please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   |   | Regularly test security systems and processes | *\<\<Describe how this detailed design addresses regular testing to ensure security is maintained over time and despite any changes.  If this design relies on existing procedures or processes please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   |   | Maintain a policy that addresses information security | *\<\<Describe how this detailed design ensures users and other third-parties (such as service providers) are aware of the sensitivity of data and their responsibilities for protecting it.  If this design relies on existing procedures or processes please state this.  Where possible, refer to section numbers in this document that address this requirement\>\>* |

## **Sample PIPEDA Requirements**

PIPEDA \= Personal Information Protection and Electronics Document Act

| Category/Domain | \# | Requirement | Details |
| ----- | ----- | ----- | ----- |
|   | 1 | Accountability | *\<\<Describe how this detailed design ensures individuals (including third parties) are aware of the sensitivity of data and their responsibilities for protecting it.  This includes the appointment of a function performing tasks of a privacy officer, publishing a privacy policy for the system and data and ensuring individuals with access to the information are aware of how to protect it.  Systems, applications and networks are designed with features to support user accountability with respect to the protection of privacy data. If the design relies on existing policies, procedures or individuals please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   | 2 | Identified Purposes | *\<\<Describe how this detailed design uses personal information that was collected.  If the design relies on existing policies, procedures or use please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   | 3 | Consent | *\<\<Describe how this detailed design obtains consent prior to the use of personal information.  If the design relies on existing policies or procedures please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   | 4 | Limiting Collection | *\<\<Describe how this detailed design ensures only required information is collected.  If the design relies on existing policies, procedures or use please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   | 5 | Limiting Use, Disclosure and Retention | *\<\<Describe how this detailed design only uses information for the purposes that it was collected and state how the information is disposed of when no longer required.  If the design relies on existing policies, procedures or use please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   | 6 | Accuracy | *\<\<Describe how the detailed design ensures information is complete and accurate.  If the design relies on existing policies or procedures please state this.  Where possible, refer to section numbers in this document that address this requirement\>\>* |
|   | 7 | Openness | *\<\<Describe how this detailed design ensures that customers, clients and employees are informed about the management of personal information.  If the design relies on existing policies, procedures or use please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   | 8 | Individual Right of Access | *\<\<Describe how this detailed design ensures individuals know what information has been collected about them and how it’s used.  If the design relies on existing policies, procedures or use please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |
|   | 9 | Challenging Compliance | *\<\<Describe how this detailed design ensures individuals can report complaints about the use of their personal information.  If the design relies on existing policies, procedures or use please state this.  Where possible, refer to section numbers in this document that address this requirement.\>\>* |

 

 

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAdQAAAKwCAYAAAAhqo69AACAAElEQVR4Xuy9B5gUVbq4/6277nq5rv7Z5N3r7ro/1wDo7ppZvWYUDKioKAhmkqQhM2RYiSqSJSNBQCRJDoogSBKQoCBIkKQSVBAECRPOv97D1GxT9MAw1QOner7ved6np6ur6lR19/Rb55yvzpF///vfoiiKoihKOE5YoCiKoijK6XPCAkVRFEVRTp8TFiinxovqha++eu7vb7hBUZSI8Ovf/HHuX/96w9y//EVRwnPhhf/zoeeCPx3nhqAslFNzzs9/3qP8hg2mqjFKEvBSnGVKcsFnXOLpVmbIAGP69VNi6dvXmEGD/vN8yBBjBnjv08CBx/5+881j6wS3K+iULNnIeEK9MtYNJ8hCOTXn/OIXr6pQk4MaHlfXrm0q791rXjx40FRJT89+rZpHpSNHTOW0tOOWK9FDhZozKSmTzGOPvWJq155uOnTYbMqWbe7R2ZQp08HcemtlU6nScCvX4HYFHU+omZ5QL491wwmyUE6NCjU5QJhVMjPNVbVqmcc//dRcXaOG+fMDD5gyixZZ0d49YoS5tGxZc1PHjub6Nm20JhthVKjx6d/fmNtuq2ratFlj2rZdZ5o1W2amTjWmfv3Z5uGH/23Kl+/hvfa5XS+4bUFHhZogVKjJQYoHoqzm1T6LVK5srmnSxFTZv9/c2qePKb96tbmuZUtTavJkU8wT7T2eXFWo0UWFmjN3351iatSYaJ58sqt54YWhZujQn8ztt79kSpduZRo2nGubfYPbKCrUhKFCTQ6ohT48f76p6T2WW7/ePLV5s/3hLT17tik9d64pu2qVqbBli3l06VLzuPd39Tj7UKKBCjVnWrZcaWrWnGzq1n3fdO++z3Ttus88/vhrpkWLFaZdu02md++jJ2yjqFATBkJ9dvduU9v7J1UUxX3qeNz3YkczZqQxb72lKOF58MGWKtREcM455/S6rW9fU2riREVRIsB9Hv+8s5ypU2uibd5UlLBce+2jZPkWiXXDCbJQFEVRFOX0OWGBoiiKoiinzwkLlFPjxS89/hx1guelKIqi5J0TFuQnXjzqUT0JmPbss88erlWrVqTxzqNxnHNTFEVRcscjxzkuKL385KabblpgkiBatWplFiyI/qls3bo1uEjjNOPdd98NLkq6aNasmVmzZk1wceRi2LBh5i3SMyMe3333XXCRxlmKG264YW6s406QXn7iFR59C3mRmppqFi5cmP183rx5ZvXq1Wb9+vXZy3bt2pX9d7xIT0+3+/jwww/N559/bn744YfgKubTTz81c+fODS5OWHDMGuFixIgRwUVJFw0aNDAff/xxcHHkol+/fqY/Q/5EPL788svgosjFkSNHzE8//RRcHKnIzMw011577dxYx50gvfwkv4Rao0YNs2zZMjN8+HDzxBNPmK+++sr+ABQpUsTMmTMnuHroCAqVN7Zw4cJmyZIlpmzZsva1V1991R4Lx1G5cmUzYcIE88gjj5jHH3/cbrNjxw7Tq1cve+XP/qjpLFq0yFSoUMHs3LnTrlOxYkWzadMm06ZNG7st67DPpUuXmrfffts8//zztqZcqVIlM378eFO+fHn7HnAMjRo1MsuXLzclSpSw70HDhg3tdrGR30LleK+++mpb7syZM+2yZ5991p4n75lfy3///fftMmL+/Plm8eLF5vLLLzcbNmww7733nl1v1qxZ9nUuMLhYWbVqla1hw0cffWRf4+Jk5cqVdn224z2O/ZzyI05HqIcPHzZ33323mT17tv1BSUtLs8fP5zBx4kR7jm+++ab9/Hht7dq15oMPPjD79u2zF1d8nizns77rrrvsPl9//XX73t5333329RkzZtjlvJ/bt2+337tvvvnGfjf5XvnvI/8zuY2gUDdu3Gj++c9/mnLlypmRI0faz4/PjfI5N46J7ybRu3dve94333yz+eyzz+zFJ3Ac/mfH9jzWr1/f1KtXz3zxxRf2/eHzPHTokF2XbYg9e/aYW2+91W5DWVu2bLHnxjqPPvqoXcb7xe/B7t27s4+ZyK1QixUrZr9DfH95n3v06GHq1KljunbtSo3EbNu2zX6/pkyZwm0T9v3lc+G79uOPP9r/N77DfDf4PvI358rrfCa8N6NHj7b78f8v1q1bZ9+/jIyMwNGcGLkV6p133mluv/12c/7559uaOb8Zbdu2zX79pptuMpMnT7bvJcf6ySef2O8bx8ixfv/99/Z95PPm/fj666/t95DfrDvuuMP+L/I/xjZ8h/kccvt7ezpC5TPmezRgwAAzffp0+/2fNm2aady4salbt64pXry4PTbeY76nfP44gO8UFRe+R5zTQw89ZH87+B/h3Pi+8Rrrc9z8Jvm/JbmJpBVq6dKlTceO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>

[image2]: <data:image/png;base64,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>

[image3]: <data:image/png;base64,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>

[image4]: <data:image/png;base64,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t23bVpfLkHLGUEU7CSe7cUJI6ojaC4e4cRJNKJBtvFgb6qVuvCRwnSKennzySfXqq6+64UD33nuvOuqoo9Qxxxyj7rnnHh2rXr26NlVbMNS77rqrUKxly5b6b4MGDdS3335baFuUYKLIkCEY8LHHHqtOPvlk1blzZ7VgwQIdh6Fu2bJFFRQUqNNPP139/fffOgM+/vjj1WGHHaaef/55XQ6Z7IEHHqh69+6ttt9+++A1EiiXDJWdkghJE6IJwkdunEQTCmQb31CvcOMlgesU8XTdddfprBTavHmz+vLLL9WyZcu0AcLAUAVshOWFCxdqQxszZkwQh2CoMC8Y2+WXX66XTbVw165dtQFC69evV0uWLFHLly9Xf/31l3WEmGxDxXF23HFHvYyMtGfPnto8u3Tpot577z115plnqt9++03NmDFDVycbwUhxPjCjSy65RMf69u2rfv/996DMVpRLhtqLhkpIehBNEZa6cRJNKFCacZ0inmBGL7zwgl5GletHH32k7r77bm2eDz74oK6qPf/883U17DXXXKM++eQT3d46YsSIQseBgd1000162TVKHOubb77Ry2vWrFHz58/Xx0QG6so21DZt2qirr7462FaxYkVtxmXLltWZ68SJE3Uc1dX16tVTgwYN0ud57bXX6hsCZLAffvihLnPbbbfpc0xCOWOohBBSkoQCpRnXKeIJGR4yPru98qWXXtJVpNOmTVPly5cP4h988IH66aefVOvWreNmqMbgXKFN9tJLLy0UQyYbrx3UNtQDDjhAnXjiicG2HXbYQb/OnnvuqdtYsY622tGjR6uGDRsG5WCiyIjRQQrnDNFQCSEkNUKBkkDU1Y2VBK5TRGnu3Lm6nRLGV7lyZTV06FBdJQu99dZbqn79+rrX7f33369jV111la5ORfWrEczq5ptvDtZdTZ8+XVfLwgTRezeqLAwV2SuE499www26Che9g7/77jsdh6Gily96BiNrhZ599lltquglbNpQsfz+++/rZfQqzjdDFTUWxrpxQkjqiA4W+rtxEk0okG28PGtDtYVszjzqYgsZ35w5c4J1GN3HH39slYj10k30KMvixYv1a0T13oVQXbxy5cpCMbz2559/HqzjOH/88YdeRoZqhHZVY6BmGzJZCOeGc0xCuWSovXDj4sYJIanjsQ01ZUKBbJPPhkpp0VAJ2QahoaZO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QihASL4AQ7344ovd//eFdPLJJ/MHgJAkgKE+++yz7n+hQN9//71q2LAh/z9thVAg23ixKt+xbpyQROSyocpL9xXeIiQOb//111/nut+ZkoaGWnxCgWzjG+oIN05IInLcUMe550JRRmKoN7rfmZKGhlp8QoFs4xtqRzdOSCJy3FBHLl68WB155JGqZcuWql27dqpjx47q3XffdU8x0Oeff66GDRvmhvW4xe3bt1edO3fWx0KZP//8U297/fXX1Q477KDatGmjypUrp44++mhnb6U6dOigunbtqsqXL6/23HNPtffee6t7773XLabq1KkTN54uVa5cWe2zzz4BxxxzjPruu+/cYlq//fabevnll/Vy7dq11ezZs9VNN92kJk2a5JRMn1q1aqUeeuihQrF//etf+rp36tRJNW3aVFWqVEnH8dnic3nttdeCsjg3xKAff/xRtzfiumN/GNENN9wQlBVDvdb9zpQ0NNTiEwoQki/kuqHuscceqnXr1uqbb75Rq1evVgcccICqVauWe4qBpk2bpk3NVdWqVdWSJUvUDz/8oI9VpkwZhR++t99+W5vUhx9+qFatWqVmzZqlf/B+/fXXQvvDtNavX69q1qyp3nnnHbV27Vq1adOmQmUgnNs999zjhtOmtm3b6h9lw7p164IbA1eI43pAa9asUb///rs2qAsuuMApmT7hZuXBBx8sFMP3B9cd5/vVV1+pgQMHqi+++EJ/DmXLllWDBg0Kyp544ok6BuF6X3fddfov9sfNEj4rGDFEQ902CQUIyRdy2VA3b9488swzz3RPR/3999/67/LlyxUMt3v37uqQQw7RGQ2yR2SZc+fOLbSPa7L4YX7ggQfU9ttvn1LGVrduXf3DDsGskPUi8xo6dKg+r5122kk98sgj6qyzztLmC7311lu6XLdu3VT//v1hBGrnnXdWLVq0UF26dNH7/PLLL/bLRAqZWjzhvE499VSdSe+44446NmTIENWkSRN1880366zvlVde0Rk2Xu/aa6/VWbkRMlgYl9ETTzyhzRHXFib8008/6fe3yy67qD59+uhj4JpD06dP10aPsjgO9rWF748tZLC4gYGhXn/99XpfIxiqMViczx133BFswzo+L3P9aajbJqFAtvFiVb6Hu3FCEpHLhvrJJ5+MxA8/hB9z/AAvWrRILV26VMdOO+00tXHjRr0MIzn/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JDzsxW6myljlaKjFJBQgJF/w0mCo1rF28P5pOzWMdcsRsq1CQy0+oUBJIKrkxghJRDoN1T9eDS9WZWgM9Qq3DCHbKjTU4hMKZBuPAzuQIpJuQ3WODXNFdVsZdxsh2yI01OITCmQbGiopKpk0VP/4aJcs48YJ2RahoRafUKAkEFV2Y4QkItOGSkhpAoaKYSKj9Ouvv6pGjRrx/9NWCAUIyRdoqISkD9FazD2LiQji8d5776m6devy/9NWCAVKAlEdN0ZIImiohKQPUUdhXws8bnO6E9vX3Y/8QyiQbbxYGypHPiEpQ0MlJHN4scFEZrtxEk0okG18Qx3jxglJBA2VkMwhulv4wo2TaEKBbOMb6slunJBE0FAJyRyiQcIkN06iCQUIyRdoqISQXCIUICRfyEVDlZcsK1TNEzjXKyFpJBTINn6V71g3TkgictRQszYvaBrU1D1/QgxerA11iRsn0YQC2cY3VPbyJSmTo4ZasGLFCvXQQw+pKVOmaL788kv3tNTSpUv1to8//tjdpN5++2297d5771UPP/xwcJx4mjlzphtKRQXu+RNi8GJTvgWzLZHEhALZxjfUYPolQpIlVw31iSeeUDVr1tQjy4BrrrlGD7YPYfi2Jk2aqGnTpultL730kmrXrp1at25dcM6///672rhxo/rf//6nKlasqMthPZ46d+7shlJRgXv+hBi82LywwXyuJDGhACH5Qi4baq1atYJzgEG2atVKL1911VVq8eLFwTaoefPm6o033igUg1599VVVqVKlYP2nn37So9XY+9uG+umnn6q//vpLM2/ePM3ff/+ttyEj/u6779Trr7+ufv75Z7NLgXv+hJCiEwoQki/kqqE++eSTqmrVquq1117TpoiMFEO2IQstX758cG4wuUWLFukqYTtDNUL2agwVZnrQQQepVatWKRg2MleoS5cuasaMGfr4EAy0Q4cO+ngou+eee+p4v3791PTp0/Vy9erV1eTJk7FY4J4/IaTohAIlgaiTGyMkEblqqM8884wqW7as2meffXR17oABA9QHH3ygvv3220KGCjNEVTAYO3ZsEDeyDRXGPGfOnGDbMccco//CZCtXrqzMdUAW2rNnT3XddddpOnbsqOO4DkbdunVTl112GRYL3PMnxCDaXzjDjZNoQoFs47FTEikiuWqoyCBr167tnorWmDFj1GeffVYo1rp1azV48OBCMcg2VFTVvvXWW8G2ww47TP/dd999dfaKamNo7dq1eL9BOVT/Qscff3wQwz6jR4/GYoF7/oQYPHZKSplQINv4hnqFGyckEblqqI8//riqUaOGeypa6JSEKbBQBjN4oO20SpUqatKkSW5Rham0TEaLTkndu3dX33zzjbr//vuDOLJgCNW5Tz31lF5GhygY8MKFC/U+0HHHHaf/Qp06dVIjR47EYoF7/oQYRFOEpW6cRBMKEJIv5KqhbtiwQS1ZssQ9lUKCMeKRGbeDki2YqL0dvX3R0WjZsmVBDMcxwvFMb2C0zS5YsED99ttveh3VzUbYB8auaKiEpJVQgJB8IVcN1T2HHFaBe/6EkKITCmQbv8qXz6GSlKGhFlsF7vkTYvD4HGrKhALZxjfUcW6ckEQka6hS7kB330yhaKhkG0E0WfjajZNoQoFs4xsqx/IlKZOCoU4TXkH5YjBX6OCeg4tK0lD//PNP9eijj6oHHnggwO7FuzXhsRzTe7eYKnDPnxCDx7F8UyYUKAlELdwYIYmA0SVjqO5+RUHUVGjnxl1UkoaKDkZyPFWnTh2100476cdsLrjgArdYoB9++EEPBAFh1CUY6tVXX63efPPNwgVTU4F7/oQYRHsJ/+fGSTShACH5QpYNtW06DXXTpk1q2LBhblgLQwhigAaM94veuZs3b9aPuWCgBsTfffddneHusMMO+vlVjMhkD8CPR3HMkIMJVOCePyGk6IQChOQL+W6ow4cPd8Nae+21l9p///31M6ZNmzbV2emRRx6pR0fCoBDIULE/nl894IADdPyEE07Q+/7xxx/qnHPOcY4YqQL3/AkhRScUyDZerA11jBsnJBH5bqgwTmSpYMiQIcEzpbvttpvOSiEYKTRr1iw9EITZDtWrV0/PSAPDNSMlYWYbDMafpArc8yfE4LENNWVCgWzjG+oIN05IIvLdUEeNGuWGtdq0aRPMCGOGGHzllVeCQR5sQ3322Wf18qBBg9SWLVtU27Zt9XqSKnDPnxCD6BZhvhsn0YQCJYGorhsjJBH5bqinn366+uqrr3T7J1i5cqXehrF9MT4vdOihh+q/MFQMLYjs02SjGGJw/PjxehmdlFAFjFllUlCBe/6EGESNhJZunEQTChCSL+S7oWIKtgYNGqj69etrjHliyjVjqL1799Z/V69ercqVK6eee+45naGi09FJJ50UTFwOYRmP1KSgAvf8CSFFJxQoCURl3BghichnQ02n0PP37bffVpdffrm7KZEK3PMnxIDfZaGsGyfRhALZxv/Q+rtxQhJBQ43p6aefVrvssos21hRV4J4/IQbRZcJ0N06iCQWyjW+oo9w4IYmgoRZbBe75E2IQTRQ+ceMkmlAg2/iGerEbJyQRNNRiq8A9f0IMouuFN904iSYUICRf2BYNFb14MQqSLTxCg2dNUaVrV+ui7Lp166ySMSGGTk94jAbLZr8ff/zRLVrgnj8hpOiEAoTkC9uioT7//PPBAA5GBx10kKpevXow7u+AAQPUmjVr1PTp01WNGjXU+vXrC5VHDI/TvP7666pWrVqqbt26GsTPOussu2iBe/6EkKITCmQbL1blO8SNE5KIXDdUPBv60UcfBYb322+/6aEDkW2iV64tjIy0atUq9eKLL+oytjCikj0IxNixY7VB4rlUDE147rnnBttwXDyCM27cODVjxgxtorbQE9gy4AL3/AkxiMYLb7txEk0okG18Qx3pxglJRK4baq9evVTHjh31yEcPP/ywWrFiheratas6+OCD9bOmjz32mC6HTLJTp06qR48eepsZEckI+2NwfKMxY8bo51efeOIJva1du3ZBdS7GB953333VZZddFtdQTzvtNPXLL7+Y1QL3/AkxeLFOSQvcOIkmFMg2vqHysRmSMrlsqMg2MfoRTBTTslWtWlV9//33qnLlysG5wewwYAOqcVEOwryorqHCbKtVq6ZatGihB3XA4PdoG33wwQf14zJHHXWUHnoQ2W23bt1U586dtQFjdKXy5cvrQfYbNWqkt73//vv2oQvc8yfEIBotPOPGSTShQEkAU3VjhCQilw0VgrE1a9ZMZ4xo/0THIBijkTFSZLFm7N533nlHLVy4MCgDIQPFMIULFiwotA2G2qRJEzV16lS1++67q0suuUS3r7Zv314bKjJUtL1CmIUGBj579uxgf0VDJVsBv8v8bU6NUICQfCGXDRXtnKYaFtOrYZxd11Axqfjy5cv1vKYTJ07Uba59+/YtNLcphGrdoUOHFopBMNSdd95ZL6OzUc+ePfXE5fEMFfrkk09UpUqVgnVFQyUkrYQCJYGonhsjJBG5bKiYJBwdhvr06aMzVIzbC0P1nLF30QFpwoQJqmHDhnoOVHQocjslwTTtjkdGkyZN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>

[image5]: <data:image/png;base64,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>

[image6]: <data:image/png;base64,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>

[image7]: <data:image/png;base64,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>

[image8]: <data:image/png;base64,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>

[image9]: <data:image/png;base64,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>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAU0AAAD7CAYAAADuFMYYAAAPeElEQVR4Xu3daZvdxJkG4PwnwJh9x2BWg1mMWQIMZAATNgMBbHDMYsAYMJjFYDADSTAQMklmcTIz/01zXnHJUdfR6dKrbpvuzv3hvvqcUqmkknQelRbDL47/+H8NAOP8oiwAYDGhCZAgNAEShCZAgtAESBCaAAlCEyBBaAIkCE2ABKEJkCA0ARKEJkCC0ARIEJoACUITIEFoAiQITYAEoQmQIDQBEoQmQILQBEgQmgAJQhMgQWgCJAhNgAShCZAgNAEShCZAgtAESBCaAAlCEyBBaAIkCE2ABKEJkCA0ARKEJkCC0ARIEJoACUITIEFoAiQITYAEoQmQIDQBEoQmQILQBEgQmgAJQhMgQWgCJAhNgAShCZAgNAEShCZAgtAESBCaAAlCEyBBaAIkCE2ABKEJkCA0ARKEJkCC0ARIEJoACUITIEFoAiQITYAEoQmQIDQBEoQmQILQBEgQmgAJQhMgQWgCJAhNgAShCZAgNAEShCZAgtAESBCaAAlCEyBBaAIkCE2ABKEJkCA0ARKEJkCC0GTF9h483ux8dH9z7Y7dzZXbn1iTYt1iHWNdy/WHDKHJZEdPnGyDqAyotS7WOda97A+MITSZbD0GZifWvewPjCE0mSQuc8sgWm9cqjOF0GSSnY+t31Fmx2iTKYQmk2xdww99xtp61+65fkGN0GSSMoDWq7JfUCM0maQMn/Wq7BfUCE0mKcNnvSr7BTVCk0nK8Blr10uHmz0Hj1fdfN8LS+a7qfi+Wsp+QY3QZJIyfMZ499iPc+0scvTbk3Pz3vbQ3rk2V6pcLtQITSYpw6fm/icPzLVR05//yNd/bYN0tYOzXCbUCE0mKcOn5ul9H821UdOfP0IzylY7OMtlQo3QZJIyfGpWKzTDagZnuUyoEZpMUoZPzWqGZlit4CyXCTVCk0nK8KlZ7dAMqxGcZZtQIzSZpAyfmtMRmmGlwVm2BzVCk0nK8Kk5XaEZVhKcZVtQIzSZpAyfmpWG5v7Dv2ve/OS7hWL6lP9yfLlMqBGaTFKGT81KQ/N0KZcJNUKTScrwqRGabBRCk0nK8KmZEprx783Hmvrf9yyXCTVCk0nK8KmZEpoZ8aBoysOgsh2oEZpMUoZPzekOzRDLKJdbU7YBNUKTScrwqRGabBRCk0nK8KkRmmwUQpNJyvCpEZpsFEKTScrwqRGabBRCk0nK8KkRmmwUQpNJyvCpEZpsFEKTScrwqRGabBRCk0nK8KkRmmwUQpNJyvCpEZpsFEKTScrwqRGabBRCk0nK8KkRmmwUQpNJyvCpEZpsFEKTScrwqRGabBRCk0nK8KkRmmwUQpNJyvCp2fno/rk2Vtv9Tx6YW25N2QbUCE0mKcNnjPgfoJXtrJZDx/40t7wxynagRmgySRk+YwhNNgKhySRl+Iz18LPvNHsOHl9Vu146PLecscp+QY3QZJIyfNarsl9QIzSZpAyf9arsF9QITSYpw2e9KvsFNUKTSab+f8bXkq137Z7rF9QITSbZ+dj+uRBab87Eu6NsPEKTSfa+c3wuhNab6EPZL6gRmky2nkebRplMJTSZ7Oi3J9dlcEZgfnbi5Fx/YAyhyYrFZW6E51p+OBTrFmHpkpyVEpoACUITIEFoAiQITYAEoQmQIDQBEoQmQILQBEgQmgAJQhMgQWgCJAhNgAShCZAgNAEShCZAgtAESBCaAAlCEyBBaAIkCE2ABKEJkCA0ARKEJoPOOuusubLT4UwtZy37ubbBmVruY0+/2Nx6x8658uXccvtdza7de+bKxzqdfVs2NGPBnXPP3dxcevmVzfYd9zQvvnqo+fKP/7uiuuWyxugvY9O55zZXXLWl+dWvn20+/+7kXN31Zsw2iTrX3bhtrryz9YZto9oZY7XaqTlTyzmTsvvpTGyDoWUMla22z078d3PBRRc3731+4lTZq+8ebbbdtqM577zzm0suu7x58JEn23r9+d797Nvmwtl8U3/bp7Nv1dDsPh/7/u/Nh8d/bF567d32gIhOH/vubyuum7FkGbP23v746+bGbbc1v3x411zd9WbMNok6V159TfP6e5/PTXvtvc/aaWPaGWO12vlndCb301hnenmd3/z27Wb7nfcsKbvh5u3Ny29+0HzyzV+aI//2782d9zzQ3H3/r+bmjdFmDLrK8jFOZ39Hh2bflz/8T3Pz9jubXc+8tKp1a4bmO/LVj82FF19y6nuc0W6/677m/AsubM47/4L2c+ycOHNdfOllS8I7fPbtf7Vnwk9//x9t+8+89Fpz1TVb29Hy1dde17xx+It2x8eoNspihx/+8oclbcQBsGXr9e3o97IrrmovR6Lf/fWOOtffdEu7ThfN1veu+x5qPvndX09NL5X97Oq9+Oo77cFUTusOsHLe3Xteby6/8urmnHM2tX9373ljbt7nXj7QrnfUiX7GMsp2xvTx2b1vzLbx5c3ZZ599qmy5fnd1+p+HdNMX7duyPxlj+lXrQym7n8pt/cxsny23P4a29XLbptyeXVvlcmvHypRtccfd97e/n7K8L357sd5l+XOvvDkL1Afnyj8/cbK5ZusN7TZYUn92HF97/U3t6LTft/ePnWhu23FvO3LdPBvdxvq/8taRUe2Uyw6TQjNEmESorHbd5QzNV4bmlmuvb4f/0eGjf/jP2Sj08eaeBx9pp916593Ns7MN0p8/NtA9D/zrqfYjFCNgI0wf2vVMuzNjNNsvi3a6+aNvscz4GzshdtC27TvaH19/va/asrV59dCnbRtHvvpTs+PeB5ccEEN9K0WduNURbR385JtT5QdnI+4oi2n9dva88X77w+qWG3/jexz4XZ3fHvy4/YHGqCjqxEjo0suuWNLO2D7edMvtzQfH/7ikbCX9fnF2pRJXKd335fbtFGP7VetDKbuf+p/jx9zfH/E3bnWV9cttXds2Q9s5e6xM2RaXzdb9/WPfzZX3vff5t20f58tPtOFdlofoe6zf6+//NJo/8MGX7XaLdYrv/b5dc92NzRPPv9KGe7tNZ/N0x1WtnSGTQzMOshh5rXbd5fTni1sAcRDedOsdzX0PPTZXt3N0tpFio8TnOADj0qh/j/WGbdtn7fx0YEf7EY7dtNjIQ2X9s2Is/60jXy1ZZgT55VduOfU92ohbCf06H3395+aCCy9aUqc/fUhXJ0Yq/QM1Lm8iYMp2rrvxlmbvgcNL2ogfR5xpu+9xQuj/MELM029nbB/7AdGVTe13hHec7WP/ldM6/X07xdh+1fpQyu6n/uc4ab/y5odL2ov9U9Yvt3Wp3DZD2zl7rEzZFvG7j99/Wd4X2+WRp34zVx73Ofu5UYqgu2TWxzjpRdD192W/bzG6jP1azj+mnSErC83N44IwU3c5MV9n06afLiEeno38+jvlg9ml8+0772uH4l3d7hImxA+xC4m4zI7Q6Lc/9NBqqKz7HJf20X5fucyhNsp2xmyTrk60tWV2WRHrH+Jz1/6SdZsdzOWlU3zvH+RxAojLo7LOlD7GiazfztR+Hzr6h3ZEE/fF++W1fZs1tl+1PpSy+6ncZ7X9MbSta9tmaH3L5daOlSnbYtOmc5cNzRgBxi2L/i2RTpkbQ+J2WvQznp/0y/vrFBkR+/ref3m0eX7f2+191LHtDJkcmgc++KI9CFa77nLGzBchGBvpw9mZJXbEse//tmS+OPtff/Ot7edHnnj+1Jl/Ufu1sjgohnbCovqLyhfVWVQ/dm48AItR9p7X3xuss+iH0B8pj/mRTu3jUFlZXtaJ5URgliOaUNu3WVP7tVx5OW3Mfir3Wbk/uvvtQ/U7tW0zNE+53NqxMtTGcuXhp8vzfzw57/v1cy+3673o3mFcnsfIryzvixHq2eec0zz2zD9uqYRynWJk/vize2cnll+2fX3y+X2j2hkyKTTjbBP3BB7vvUe1GnVrxsy3efN57X2L7ntc5vXniwMq7p9EkMelR3nTv2yvVhZtxFmqrLOo/qLy2GFDZ/FF9aPu1htubvXn69eJS66XD8xfemcvz6f2caisLO9/jv0WVwJxX6+cJ9T2bdbUfi1XXk4bs5/6n4cuz+P7ovqd2rYZOr6yx8rQcpcrD/Eg6Pl9b82Vx4gv2u6vc+mnB0EPzJV39r39UftbjhNsPOSN79205dYpRv3xIGtMO0NGh+YXP/y9PYt19zmWe40oUzdjzHzxNCzOIjG0j3sTV225dm6+mB6X9o8+9UK1/VrZ/kOftmfjODDizPzxN39pN3rcqB+qv6idOKPGQ5nywF5Uf5F+ndj+8VAnfkD9hzz9kIx1rT0ImtrHobKyvP85jpOnX3x1rn5nzL7NfJ/ar+XKa9OG6vQ/R0DG6Czus8U9vfgb3xfV79S2zdDx1Z8+5lgZWu5y5SHCsf/gNMSDpDiJlCPqUrwQ/8L+d5aUdcs6/MX37dP7uA8Z3+MBzsWXXHrqzZb+OsXAYN/bR9q3CaJvcaKMk/OYdoZUQ7MTlzKxEeOdq3gFovxxT63bVy6/NKZOnC3iaVnc84x1eOqF/XPzxYaLm8Mff/3navtjyiJw4ocWZ/sY+scrVnFgLKo/VL7n9ffbH0d3X62sW9ZfpKwTB0icIGKkMfQaSYg3CrpXXOIhSPmKS5jSx6Gysrz8PKSbPmbfZr9P6ddy5bVpQ3XK+vHqT4x8uv0Rb3hEnxfVD7VtM3R8le3UjpWyfq08RIiXL7fHKC/mKfVDNJ6oD73cHvWizXhboLzEjoCO18dien+d4uQYD/3iZfpYl7j3G6E4pp1+eWfZ0Nyo4mwe75eV5bAWxSgo3vooy9eLeEf7ltt3zpUvJ+qv5J9Rnk7/dKEZ71/Fy+vLvYIAP6c4oR/69PftSOfND79sR0PxEKOsx89jTYVmOVzvK+tOEe3EZdiiBw2wFsQ91vZfpW3e3I4w4/KxvMXFz2dNhSbAWic0ARKEJkCC0ARIEJoACUITIEFoAiQITYAEoQmQIDQBEoQmQILQBEgQmgAJQhMgQWgCJAhNgAShCZAgNAEShCZAgtAESBCaAAlCEyBBaAIkCE2ABKEJkCA0ARKEJkCC0ARIEJoACUITIEFoAiQITYAEoQmQIDQBEoQmQILQBEgQmgAJQhMgQWgCJAhNgAShCZAgNAEShCZAgtAESBCaAAlCEyBBaAIkCE2ABKEJkCA0ARKEJkCC0ARIEJoACUITIEFoAiQITYAEoQmQIDQBEoQmQILQBEgQmgAJQhMgQWgCJAhNgAShCZAgNAEShCZAgtAESBCaAAlCEyBBaAIkCE2ABKEJkCA0ARKEJkCC0ARIEJoACUITIEFoAiT8P2cmFqi6goYPAAAAAElFTkSuQmCC>

[image11]: <data:image/png;base64,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>

[image12]: <data:image/png;base64,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>

[image13]: <data:image/png;base64,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>

[image14]: <data:image/png;base64,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>

[image15]: <data:image/png;base64,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>