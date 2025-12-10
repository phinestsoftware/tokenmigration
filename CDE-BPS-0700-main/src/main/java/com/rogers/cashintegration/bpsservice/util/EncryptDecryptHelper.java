package com.rogers.cashintegration.bpsservice.util;
/*
 * Created by Shankar.Chakraborty on 2024-02-08 - 7:41 a.m.

 * @project cs-process
 * @author Shankar.Chakraborty
 */

import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.NoSuchProviderException;
import java.security.SecureRandom;
import java.util.Date;
import java.util.Iterator;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.openpgp.PGPCompressedData;
import org.bouncycastle.openpgp.PGPCompressedDataGenerator;
import org.bouncycastle.openpgp.PGPEncryptedData;
import org.bouncycastle.openpgp.PGPEncryptedDataGenerator;
import org.bouncycastle.openpgp.PGPException;
import org.bouncycastle.openpgp.PGPLiteralData;
import org.bouncycastle.openpgp.PGPLiteralDataGenerator;
import org.bouncycastle.openpgp.PGPPublicKey;
import org.bouncycastle.openpgp.PGPPublicKeyRing;
import org.bouncycastle.openpgp.PGPPublicKeyRingCollection;
import org.bouncycastle.openpgp.PGPUtil;
import org.bouncycastle.openpgp.bc.BcPGPPublicKeyRingCollection;
import org.bouncycastle.openpgp.operator.PGPDataEncryptorBuilder;
import org.bouncycastle.openpgp.operator.bc.BcPGPDataEncryptorBuilder;
import org.bouncycastle.openpgp.operator.bc.BcPublicKeyKeyEncryptionMethodGenerator;
import org.jasypt.encryption.pbe.StandardPBEStringEncryptor;
import org.jasypt.encryption.pbe.config.EnvironmentStringPBEConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.rogers.cashintegration.bpsservice.exception.CashIntegrationErrorCode;
import com.rogers.cashintegration.bpsservice.exception.CashIntegrationException;

@Component
public class EncryptDecryptHelper {
	private static final Logger logger = LoggerFactory.getLogger(EncryptDecryptHelper.class);
    
    
    @Value("${batch.amex.int_27.pgp.publicKeyRingFileName}")
    private String publicKeyPath;
    
    @Value("${cs.encryption.algorithm}")
    private String algorithm;


    @Value("${cs.encryption.password}")
    private String secretKey;

	public String encryptDecrypt(String text, String operation) {
		try {
			EnvironmentStringPBEConfig config = new EnvironmentStringPBEConfig();
			config.setAlgorithm(algorithm);
			config.setPassword(secretKey);
			config.setStringOutputType("hexadecimal");
			config.setProvider(new BouncyCastleProvider());

			StandardPBEStringEncryptor encryptor = new StandardPBEStringEncryptor();
			encryptor.setConfig(config);
			return operation.equalsIgnoreCase("encrypt") ? encryptor.encrypt(text) : encryptor.decrypt(text);

		} catch (Exception ex) {
			throw new RuntimeException(ex.getMessage());
		}
	}
	
	 /**
     * Attempts to retrieve the public key from the file path provided then
     * attempts to PGP encrypt the data.
     * 
     * @param payloadDataToEnc
     *            - byte array containing the data to encrypt
     * @return a byte array containing the encrypted data
     * @throws CashIntegrationException
     *             {@link CashIntegrationException} If any exception occurred
     *             then it was wrapped into this for processing in the flows
     *             custom exception strategy.
     */
    
    public byte[] performAmexFileEncryption(byte[] payloadDataToEnc, String fileNameToEncrypt) {
		
    	if(payloadDataToEnc == null)
    	{
    		throw new CashIntegrationException(CashIntegrationErrorCode.BATCH_PUT_AMEX_PGP_ERROR, "The payload data was retrieved as null");
    	}
    	else {
    		logger.info("BPS|BATCH_PUT|AMEX_Encryption|Attempting to retrieve public key from file");
    		if (logger.isDebugEnabled()) {
    			logger.debug("BPS|BATCH_PUT|Retrieving payload to encrypt");
    		}

    		PGPPublicKey pubKey = null;
    		try {
    		    // attempt to read the public key from file
    		    pubKey = readPublicKey();

    		} catch (FileNotFoundException ffe) {
    		    // wrap and re-throw exception
    		    throw new CashIntegrationException(CashIntegrationErrorCode.BATCH_PUT_AMEX_PGP_ERROR, "Unable to find the PGP public key", ffe);
    		} catch (IOException | PGPException e1) {
    		    // wrap and re-throw exception
    		    throw new CashIntegrationException(CashIntegrationErrorCode.BATCH_PUT_AMEX_PGP_ERROR, e1);
    		}

    		if (pubKey == null) {
    		    // wrap and re-throw exception
    		    throw new CashIntegrationException(CashIntegrationErrorCode.BATCH_PUT_AMEX_PGP_ERROR, "The Public key is null");
    		}
    		try {
    		    // encrypt the file
    		    return encryptFile(payloadDataToEnc, pubKey, fileNameToEncrypt, true);
    		} catch (NoSuchProviderException | IOException | PGPException e) {
    		    // wrap and re-throw exception
    		    throw new CashIntegrationException(CashIntegrationErrorCode.BATCH_PUT_AMEX_PGP_ERROR, e);
    		} catch (Exception e) {
    		    // wrap and re-throw exception
    		    throw new CashIntegrationException(CashIntegrationErrorCode.BATCH_PUT_AMEX_PGP_ERROR, e);
    		}
    	}
    	
    }
    
    
    /**
     * Attempts to read in the public key from the location that was provided as
     * an argument to this transformer
     * {@link AmexPgpEncryptionTransformer#publicKeyPath}
     * 
     * @return {@link PGPPublicKey} - object that represents and contains the
     *         public key data
     * @throws IOException
     *             If there was a problem opening a stream to the public key
     *             file
     * @throws PGPException
     *             If there was a problem in creating any PGP objects
     * @throws CashIntegrationException
     */
	private PGPPublicKey readPublicKey() throws IOException, PGPException, CashIntegrationException {

		// get the input stream to the key file

		try(InputStream keyIn = PGPUtil.getDecoderStream(new FileInputStream(publicKeyPath))) {

			// create a collection object from the input data
			PGPPublicKeyRingCollection pgpPub = new BcPGPPublicKeyRingCollection(keyIn);
			PGPPublicKey key = null;
			@SuppressWarnings("rawtypes")
			Iterator rIt = pgpPub.getKeyRings();
			// iterate through all the keyrings in the collection object
			while (key == null && rIt.hasNext()) {
				PGPPublicKeyRing kRing = (PGPPublicKeyRing) rIt.next();
				@SuppressWarnings("rawtypes")
				Iterator kIt = kRing.getPublicKeys();
				// iterate through all the keys in the keyring
				while (key == null && kIt.hasNext()) {
					PGPPublicKey k = (PGPPublicKey) kIt.next();
					// if the key is an encryption key set it to be returned
					if (k.isEncryptionKey()) {
						key = k;
					}
				}
			}
			// if no encryption keys were found
			if (key == null) {
				throw new CashIntegrationException(CashIntegrationErrorCode.BATCH_PUT_AMEX_PGP_ERROR,
						"Can't find encryption key in key ring.");
			}
			return key;
		} 

	}
	
	/**
     * Runs a compressed encryption of the data using the
     * {@link PGPEncryptedDataGenerator}, Encryption Algorithm = CAST5, Provider
     * = BC. The PGP output is armored.
     * 
     * @param clearData
     *            - the byte array containing the data to encrypt
     * @param encKey
     *            {@link PGPPublicKey} - the key to encrypt with
	 * @param fileNameToEncrypt 
     * @param withIntegrityCheck
     *            - perform encryption with integrity check?
     * @return - The encrypted data
     * @throws IOException
     *             Thrown if there is a problem opening one of the encryption
     *             streams
     * @throws NoSuchProviderException
     *             Thrown if the provider cannot be found
     * @throws PGPException
     *             Thrown if there was a problem encrypting the data
     */
	private byte[] encryptFile(byte[] clearData, PGPPublicKey encKey, String fileNameToEncrypt, boolean withIntegrityCheck)
			throws IOException, NoSuchProviderException, PGPException {

		ByteArrayOutputStream encOut = null;

		try {

			OutputStream cOut = null;

			try {
				// This is the stream where we want the encrypted and compressed
				// data to
				// end up
				encOut = new ByteArrayOutputStream();

				/*
				 * NOTE:2015-03-20-ASCIIARM-TO-BIN
				 * 
				 * Rogers asked us to encrypt files in binary instead of Ascii Armored. On that
				 * basis commenting out the ArmoredOutputStream decorator below.
				 * 
				 * TODO: Make PGP encryption output mode flexible by introducing a configuration
				 * property whose value will determine if the output will be in binary or ASCII
				 * armored
				 */

				// setting up the compression output stream
				ByteArrayOutputStream bOut = new ByteArrayOutputStream();

				PGPCompressedDataGenerator comData = new PGPCompressedDataGenerator(PGPCompressedData.ZIP);
				// open it with the final destination
				OutputStream compressionOutputStream = comData.open(bOut);

				PGPLiteralDataGenerator lData = null;

				OutputStream pOut = null;

				try {
					// write the input data into a 'packet' and compress
					lData = new PGPLiteralDataGenerator();

					pOut = lData.open(compressionOutputStream, PGPLiteralData.BINARY, fileNameToEncrypt,
							clearData.length, new Date());
					// writing the clear data
					pOut.write(clearData);
				} finally {
					if (lData != null) {
						lData.close();
					}
					if (comData != null) {
						comData.close();
					}
				}

				// setting up the encryption
				PGPDataEncryptorBuilder encryptorBuilder = new BcPGPDataEncryptorBuilder(PGPEncryptedData.CAST5)
						.setSecureRandom(new SecureRandom()).setWithIntegrityPacket(withIntegrityCheck);

				PGPEncryptedDataGenerator cPk = new PGPEncryptedDataGenerator(encryptorBuilder);

				// adding the encryption key
				cPk.addMethod(new BcPublicKeyKeyEncryptionMethodGenerator(encKey));

				// getting the clear data 'packet' to encrypt
				byte[] bytes = bOut.toByteArray();

				// setting up the output stream for encryption
				/*
				 * see NOTE:2015-03-20-ASCIIARM-TO-BIN
				 */
				cOut = cPk.open(encOut, new byte[1 << 16]);

				cOut.write(bytes);

			} finally {
				// writing the clear data 'packet' to the encryption stream
				if (cOut != null) {
					cOut.close();
				}

				/*
				 * NOTE:2015-03-20-ASCIIARM-TO-BIN
				 */

			}

			// return the encrypted data
			return encOut.toByteArray();

		} finally {
			if (encOut != null) {
				encOut.close();
			}
		}

	}
    
    
}
