package com.rogers.cce.creditoption.util;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import com.rogers.cce.creditoption.config.CryptoConfig;

@Component
public class CryptoUtil {

    @Autowired
    CryptoConfig cryptoConfig;

    @Value("${secret.encryptionAlgo}")
    public String AES_CBS_PADDING;

    @Value("${secret.algorythm}")
    public String ALGORITHM;

    public byte[] encrypt(final byte[] message) throws Exception {
        byte[] key = getKey();
        byte[] IV = getIV();
        return encryptDecrypt(Cipher.ENCRYPT_MODE, key, IV, message);
    }

    public byte[] getKey(){
        String origKey = cryptoConfig.getEncryptionKey();
        //System.out.println(origKey);
        byte[] decodedKey = Base64.getDecoder().decode(origKey);
        SecretKey key = new SecretKeySpec(decodedKey,"AES");
        //System.out.println("This is the Key ::: " + Base64.getEncoder().encodeToString(key.getEncoded()));
        return decodedKey;
    }
    public byte[] getIV(){
        String origIV = cryptoConfig.getEncryptionKeyIv();
        byte[] decodedIV = Base64.getDecoder().decode(origIV);
        SecretKey IV = new SecretKeySpec(decodedIV, "AES");
        //System.out.println("This is the IV ::: " + Base64.getEncoder().encodeToString(IV.getEncoded()));
        return decodedIV;
    }
    public byte[] decrypt(final byte[] message) throws Exception {
        byte[] key = getKey();
        byte[] IV = getIV();
        return encryptDecrypt(Cipher.DECRYPT_MODE,key, IV,message);
    }

    private byte[] encryptDecrypt(final int mode, final byte[] key, final byte[] IV, final byte[] message)
            throws Exception {
        final Cipher cipher = Cipher.getInstance(AES_CBS_PADDING);
        final SecretKeySpec keySpec = new SecretKeySpec(key, ALGORITHM);
        final IvParameterSpec ivSpec = new IvParameterSpec(IV);
        cipher.init(mode, keySpec, ivSpec);
        return cipher.doFinal(message);
    }
}
