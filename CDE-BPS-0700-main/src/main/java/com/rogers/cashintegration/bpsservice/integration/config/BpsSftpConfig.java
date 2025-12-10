package com.rogers.cashintegration.bpsservice.integration.config;

import java.io.ByteArrayInputStream;

import org.apache.sshd.sftp.client.SftpClient.DirEntry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.expression.common.LiteralExpression;
import org.springframework.integration.file.remote.gateway.AbstractRemoteFileOutboundGateway;
import org.springframework.integration.file.remote.session.CachingSessionFactory;
import org.springframework.integration.file.remote.session.SessionFactory;
import org.springframework.integration.file.support.FileExistsMode;
import org.springframework.integration.sftp.dsl.Sftp;
import org.springframework.integration.sftp.dsl.SftpOutboundGatewaySpec;
import org.springframework.integration.sftp.session.DefaultSftpSessionFactory;
import org.springframework.integration.sftp.session.SftpRemoteFileTemplate;

import com.rogers.cashintegration.bpsservice.util.BpsConstants;
import com.rogers.cashintegration.bpsservice.util.EncryptDecryptHelper;
import com.rogers.cashintegration.bpsservice.util.XmlUtils;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
public class BpsSftpConfig {
	private static final Logger logger = LoggerFactory.getLogger(BpsSftpConfig.class);

	@Autowired
	private EncryptDecryptHelper encryptDecryptHelper;

	@Value("${batch.amex.int_27.host}")
	private String int27_host;

	@Value("${batch.amex.int_27.port}")
	private int int27_port;

	@Value("${batch.amex.int_27.user}")
	private String int27_username;

	@Value("${batch.amex.int_27.password}")
	private String int27_password;

	@Value("${batch.amex.int_27.upload.dir}")
	private String int27_remoteDirectory;

	@Value("${batch.cpt.host}")
	private String cpt_host;

	@Value("${batch.cpt.port}")
	private int cpt_port;

	@Value("${batch.cpt.user}")
	private String cpt_username;

	@Value("${batch.cpt.password}")
	private String cpt_password;

	@Value("${batch.cpt.upload.dir}")
	private String cpt_remoteDirectory;

	@Value("${batch.amex.int_27.timeout}")
	private int amexTimeout;

	@Value("${batch.amex.int_27.maxConnectionPoolSize}")
	private int amexConnectionPoolSize;
	
	@Value("${batch.cpt.response.timeout}")
	private int cptTimeout;
	
	@Value("${batch.cpt.maxConnectionPoolSize}")
	private int cptConnectionPoolSize;

	/**
	 * SFTP Configurations for AMEX & CPT userName Password are encrypted.Need to
	 * decrypt while creating a connection
	 **/

	@Bean
	public SessionFactory<DirEntry> int27ClientFactory() {
		DefaultSftpSessionFactory clientFactory = new DefaultSftpSessionFactory(true);
		clientFactory.setHost(int27_host);
		clientFactory.setPort(int27_port);
		clientFactory.setUser(int27_username);
		clientFactory.setPassword(int27_password);
		clientFactory.setTimeout(amexTimeout);
		clientFactory.setAllowUnknownKeys(true);
		String maskedUsername = XmlUtils.maskString(int27_username, 4);
		logger.info("SFTP AMEX INT27 host is: {} port : {} with username : {} ", int27_host,
				int27_port, maskedUsername);
		return new CachingSessionFactory<>(clientFactory, amexConnectionPoolSize);
	}

	/**
	 * To transfer AMEX file to FTP
	 * 
	 * @return
	 */
	@Bean
	public SftpOutboundGatewaySpec putOutboundGateway() {
		return Sftp.outboundGateway(int27ClientFactory(), AbstractRemoteFileOutboundGateway.Command.PUT, BpsConstants.PAYLOAD)
				.remoteDirectoryExpression(new LiteralExpression(int27_remoteDirectory)).temporaryFileSuffix("")
				.autoCreateDirectory(true)
				.fileNameExpression("headers['file_name']")
				.fileExistsMode(FileExistsMode.REPLACE);
	}
	
	public void uploadFile(Object payload, String fileName) {
		SftpRemoteFileTemplate template = new SftpRemoteFileTemplate(int27ClientFactory());
         template.execute(session -> {
           session.write(new ByteArrayInputStream((byte[]) payload), fileName);
           return null;
         });
	}
	@Bean
	public SftpOutboundGatewaySpec putOutboundGatewayRename() { // To be changed to SFTP : refer previous commit for
																// SFTP config
		return Sftp.outboundGateway(int27ClientFactory(), AbstractRemoteFileOutboundGateway.Command.MV, BpsConstants.PAYLOAD)
				.remoteDirectoryExpression(new LiteralExpression(int27_remoteDirectory))
				.renameExpression("headers['file_renameTo']");

	}

	/** SFTP Configurations for CPT **/
	@Bean
	public SessionFactory<DirEntry> cptClientFactory() { // Enable for SFTP
		DefaultSftpSessionFactory clientFactory = new DefaultSftpSessionFactory(true);// Enable for SFTP
		clientFactory.setHost(cpt_host);
		clientFactory.setPort(cpt_port);
		clientFactory.setUser(cpt_username);// Enable for SFTP
		clientFactory.setPassword(cpt_password);
		clientFactory.setTimeout(cptTimeout);
		clientFactory.setAllowUnknownKeys(true);
		String maskedUsername = XmlUtils.maskString(cpt_username, 4);
		logger.info("SFTP CPT host is: {} port : {} with username : {}" 
				, cpt_host , cpt_port ,maskedUsername);
		return new CachingSessionFactory<>(clientFactory, cptConnectionPoolSize);
	}

	/**
	 * To transfer CPT file to FTP
	 * 
	 * @return
	 */
	@Bean
	public SftpOutboundGatewaySpec cptPutOutboundGateway() {// To be changed to SFTP : refer previous commit for SFTP
															// config
		return Sftp.outboundGateway(cptClientFactory(), AbstractRemoteFileOutboundGateway.Command.PUT, BpsConstants.PAYLOAD)
				.remoteDirectoryExpression(new LiteralExpression(cpt_remoteDirectory));
	}

	@Bean
	public SftpOutboundGatewaySpec cptPutOutboundGatewayRename() {// To be changed to SFTP : refer previous commit for
																	// SFTP config
		return Sftp.outboundGateway(cptClientFactory(), AbstractRemoteFileOutboundGateway.Command.MV, BpsConstants.PAYLOAD)
				.remoteDirectoryExpression(new LiteralExpression(cpt_remoteDirectory))
				.renameExpression("headers['file_renameTo']");
	}
}
