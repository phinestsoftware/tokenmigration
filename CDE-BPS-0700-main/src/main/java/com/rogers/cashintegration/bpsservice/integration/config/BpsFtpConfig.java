package com.rogers.cashintegration.bpsservice.integration.config;

import java.io.ByteArrayInputStream;

import org.apache.sshd.sftp.client.SftpClient.DirEntry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.expression.common.LiteralExpression;
import org.springframework.integration.file.remote.gateway.AbstractRemoteFileOutboundGateway;
import org.springframework.integration.file.remote.session.SessionFactory;
import org.springframework.integration.ftp.dsl.Ftp;
import org.springframework.integration.ftp.dsl.FtpOutboundGatewaySpec;
import org.springframework.integration.ftp.session.DefaultFtpSessionFactory;
import org.springframework.integration.ftp.session.FtpRemoteFileTemplate;
import org.springframework.integration.ftp.session.FtpRemoteFileTemplate.ExistsMode;
import org.springframework.integration.sftp.session.DefaultSftpSessionFactory;
import org.springframework.integration.sftp.session.SftpRemoteFileTemplate;

import com.rogers.cashintegration.bpsservice.util.EncryptDecryptHelper;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
public class BpsFtpConfig {
	/*
	 * 
	 * @Autowired private EncryptDecryptHelper encryptDecryptHelper;
	 * 
	 * @Value("${batch.amex.int_27.host}") private String int27_host;
	 * 
	 * @Value("${batch.amex.int_27.port}") private int int27_port;
	 * 
	 * @Value("${batch.amex.int_27.user}") private String int27_username;
	 * 
	 * @Value("${batch.amex.int_27.password}") private String int27_password;
	 * 
	 * @Value("${batch.amex.int_27.upload.dir}") private String
	 * int27_remoteDirectory;
	 * 
	 * @Value("${batch.cpt.host}") private String cpt_host;
	 * 
	 * @Value("${batch.cpt.port}") private int cpt_port;
	 * 
	 * @Value("${batch.cpt.user}") private String cpt_username;
	 * 
	 * @Value("${batch.cpt.password}") private String cpt_password;
	 * 
	 * @Value("${batch.cpt.upload.dir}") private String cpt_remoteDirectory;
	 * 
	 * 
	 *//**
		 * SFTP Configurations for AMEX & CPT userName Password are encrypted.Need to
		 * decrypt while creating a connection
		 **/
	/*
	 * @Bean public SessionFactory int27ClientFactory(){ DefaultFtpSessionFactory
	 * clientFactory = new DefaultFtpSessionFactory();
	 * clientFactory.setHost(int27_host); clientFactory.setPort(int27_port);
	 * clientFactory.setUsername(int27_username);
	 * clientFactory.setPassword(int27_password); log.info("SFTP host is: " +
	 * int27_host +" port : " + int27_port+ " with username : " +int27_username
	 * +" and password : " +int27_password); return clientFactory; }
	 * 
	 *//**
		 * To transfer AMEX file to FTP
		 * 
		 * @return
		 */
	/*
	 * 
	 * @Bean public FtpOutboundGatewaySpec putOutboundGateway() { // To be changed
	 * to SFTP : refer previous commit for SFTP config
	 * 
	 * return Ftp.outboundGateway(int27ClientFactory(),
	 * AbstractRemoteFileOutboundGateway.Command.PUT, "payload")
	 * .remoteDirectoryExpression(new
	 * LiteralExpression(int27_remoteDirectory)).autoCreateDirectory(true); }
	 * 
	 * 
	 * @Bean public FtpOutboundGatewaySpec putOutboundGatewayRename() { // To be
	 * changed to SFTP : refer previous commit for SFTP config
	 * 
	 * return Ftp.outboundGateway(int27ClientFactory(),
	 * AbstractRemoteFileOutboundGateway.Command.MV, "payload")
	 * .remoteDirectoryExpression(new LiteralExpression(int27_remoteDirectory))
	 * .renameExpression("headers['file_renameTo']");
	 * 
	 * }
	 * 
	 * public void uploadFile(Object payload, String fileName) {
	 * FtpRemoteFileTemplate template = new
	 * FtpRemoteFileTemplate(int27ClientFactory()); template.execute(session -> {
	 * session.write(new ByteArrayInputStream((byte[]) payload), fileName); return
	 * null; }); }
	 * 
	 * 
	 *//** SFTP Configurations for CPT **/
	/*
	 * @Bean public SessionFactory cptClientFactory(){ DefaultFtpSessionFactory
	 * clientFactory = new DefaultFtpSessionFactory();
	 * clientFactory.setHost(cpt_host); clientFactory.setPort(cpt_port);
	 * clientFactory.setUsername(cpt_username);
	 * clientFactory.setPassword(cpt_password); log.info("SFTP host is: " + cpt_host
	 * +" port : " + cpt_port+ " with username : " +cpt_username +" and password : "
	 * +cpt_password); return clientFactory; }
	 * 
	 *//**
		 * To transfer CPT file to FTP
		 * 
		 * @return
		 */
	/*
	 * @Bean public FtpOutboundGatewaySpec cptPutOutboundGateway() {// To be changed
	 * to SFTP : refer previous commit for SFTP config return
	 * Ftp.outboundGateway(cptClientFactory(),
	 * AbstractRemoteFileOutboundGateway.Command.PUT,"payload")
	 * .remoteDirectoryExpression(new LiteralExpression(cpt_remoteDirectory)); }
	 * 
	 * @Bean public FtpOutboundGatewaySpec cptPutOutboundGatewayRename() {// To be
	 * changed to SFTP : refer previous commit for SFTP config return
	 * Ftp.outboundGateway(cptClientFactory(),
	 * AbstractRemoteFileOutboundGateway.Command.MV,"payload")
	 * .remoteDirectoryExpression(new
	 * LiteralExpression(cpt_remoteDirectory)).renameExpression(
	 * "headers['file_renameTo']"); }
	 * 
	 * public void uploadCPTFile(Object payload, String fileName) {
	 * FtpRemoteFileTemplate template = new
	 * FtpRemoteFileTemplate(cptClientFactory());
	 * template.setRemoteDirectoryExpression(new
	 * LiteralExpression(cpt_remoteDirectory));
	 * template.getDirectoryExpressionProcessor(); template.execute(session -> {
	 * session.write(new ByteArrayInputStream((byte[]) payload), fileName); return
	 * null; }); }
	 * 
	 * public void renameCPTFile(String fileName, String newFileName) {
	 * FtpRemoteFileTemplate remoteFileTemplate = new
	 * FtpRemoteFileTemplate(cptClientFactory());
	 * remoteFileTemplate.setRemoteDirectoryExpression(new
	 * LiteralExpression(cpt_remoteDirectory)); remoteFileTemplate.rename(fileName,
	 * newFileName); }
	 */}
