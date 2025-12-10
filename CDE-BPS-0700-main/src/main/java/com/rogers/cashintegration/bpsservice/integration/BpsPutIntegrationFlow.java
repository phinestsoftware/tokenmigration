package com.rogers.cashintegration.bpsservice.integration;

import java.util.ArrayList;
import java.util.Collection;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.annotation.Gateway;
import org.springframework.integration.annotation.MessagingGateway;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.config.EnableIntegration;
import org.springframework.integration.core.GenericHandler;
import org.springframework.integration.dsl.IntegrationFlow;
import org.springframework.integration.file.FileHeaders;
import org.springframework.integration.router.AbstractMessageRouter;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.stereotype.Component;

import com.rogers.cashintegration.bpsservice.integration.config.BpsSftpConfig;
import com.rogers.cashintegration.bpsservice.util.BpsConstants;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
@EnableIntegration
public class BpsPutIntegrationFlow {
	private static final Logger logger = LoggerFactory.getLogger(BpsPutIntegrationFlow.class);
	
	@Autowired
	BpsSftpConfig bpsSftpConfig;
	

	@Value("${batch.amex.int_27.host}")
	private String int27_host;
	

	@Value("${batch.cpt.host}")
	private String cpt_host;
	
	@Value("${batch.amex.int_27.filename}")
    private String batchAmex27FileName;
	
	@Value("${batch.get.fileType.cpt}")
    private String batchCptFileType;
	
	@Value("${batch.get.fileType.amex.int_27}")
    private String batchAmex27FileType;
	
	/** Gateway to initiate the integration Flow**/ 
	
	@Component("bpsGateway")
	@MessagingGateway//(errorChannel = "genericExceptionChannel")
	public interface BpsGateway{
		@Gateway(requestChannel = "putInputChannel")
		void processPutRequest(Message<?> message);
	}
	
	/** Integration flow for input file router**/
	@Bean
	public IntegrationFlow bpsPutFlow() {
		return IntegrationFlow.from(putInputChannel())
								.route(fileRouter())
								.get();
	}
	
	@Bean
	public IntegrationFlow sendInt27FilesFlow() {
		return IntegrationFlow.from(sendAmexFileChannel())
				.handle((GenericHandler<?>) (payload, headers) -> {
					bpsSftpConfig.uploadFile(payload,batchAmex27FileName);
					return payload;})
				.log(message->{logger.info("BPS|BATCH_PUT|batch_async_amex_outbound|Uploaded INT27 file {} successfully over SFTP {}", message.getHeaders().get(BpsConstants.FILE_NAME, String.class), int27_host );
						return message;
				})
				.get();	
	}
	
	
	@Bean
	public IntegrationFlow sendCptFilesFlow() {
		return IntegrationFlow.from(sendCptFileChannel())
				
				.log(message->{logger.info("BPS|BATCH_PUT|Before starting upload CPT file {}", message.getHeaders().get(BpsConstants.FILE_NAME, String.class) );
				return message;
				})
				.handle(bpsSftpConfig.cptPutOutboundGateway())
				.log(message->{logger.info("BPS|BATCH_PUT|After upload CPT file {} ", message.getHeaders().get(BpsConstants.FILE_NAME, String.class) );
				return message;
				})
				.channel(c->c.direct())
				
				.handle(bpsSftpConfig.cptPutOutboundGatewayRename())
				.log(message->{
					logger.info("BPS|BATCH_PUT|batch_async_cpt_outbound|Uploaded and Renamed CPT file {} successfully over SFTP {} ", message.getHeaders().get(FileHeaders.RENAME_TO, String.class), cpt_host );
				return message;
				})
				.get();
		
	}
	
	public AbstractMessageRouter fileRouter() {
		return new AbstractMessageRouter() {
			@Override
			protected Collection<MessageChannel> determineTargetChannels(Message<?> message) {
				Collection<MessageChannel> targetChannel = new ArrayList<>();
				if(!message.getHeaders().isEmpty()) {
					if(batchAmex27FileType.equals(message.getHeaders().get("filetype"))) {
						targetChannel.add(sendAmexFileChannel());
					}
					else if(batchCptFileType.equals(message.getHeaders().get("filetype"))) {
						targetChannel.add(sendCptFileChannel());
					}
				}
				
				return targetChannel;
			}
		};
		
	}
	
	@Bean("putInputChannel")
	public MessageChannel putInputChannel() {
		return new DirectChannel();
	}
	@Bean("sendAmexFileChannel")
	public MessageChannel sendAmexFileChannel() {
		return new DirectChannel();
	}
	@Bean("sendAmexFileChannelForRename")
	public MessageChannel sendAmexFileChannelForRename() {
		return new DirectChannel();
	}
	@Bean("sendCptFileChannel")
	public MessageChannel sendCptFileChannel() {
		return new DirectChannel();
	}
	@Bean("listRemoteFilesChannel")
	public MessageChannel listRemoteFilesChannel() {
		return new DirectChannel();
	}
}
