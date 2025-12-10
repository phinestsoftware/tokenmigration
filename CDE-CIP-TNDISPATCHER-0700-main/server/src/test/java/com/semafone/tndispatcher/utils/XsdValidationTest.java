package com.semafone.tndispatcher.utils;

import com.semafone.tndispatcher.TestApplication;
import org.assertj.core.util.Strings;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;
import org.xml.sax.SAXException;
import org.xml.sax.SAXParseException;

import java.io.IOException;

import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

@RunWith(SpringJUnit4ClassRunner.class)
@SpringBootTest(classes = TestApplication.class)
public class XsdValidationTest {
    @Autowired
    private XsdValidation csRequestValidator;


    @Test
    public void shouldFailOnInvalidService() throws IOException {
        String errorPart = "element 'ccSomeService'";
        final String requestFilePath = "tokenizationRequest-invalidOp.xml";
        validateRequest(errorPart, requestFilePath);
    }

    @Test
    public void willNotFailOnCardTypeMissing() throws IOException {
        String errorPart = "";
        final String requestFilePath = "tokenizationRequest-cardTypeMissing.xml";
        validateRequest(errorPart, requestFilePath);
    }
    @Test
    public void willNotFailOnaccNoMissing() throws IOException {
        String errorPart = "";
        final String requestFilePath = "tokenizationRequest-accNoMissing.xml";
        validateRequest(errorPart, requestFilePath);
    }
    @Test
    public void willNotFailOnTokenMissing() throws IOException {
        String errorPart = "";
        final String requestFilePath = "detokeniseRequest-tokenMissing.xml";
        validateRequest(errorPart, requestFilePath);
    }

    protected void validateRequest(String errorPart, String requestFilePath) throws IOException {

        String reqBody = FileUtils.getFileContentAsString(requestFilePath);
        try {
            csRequestValidator.validate(reqBody);
            if(!Strings.isNullOrEmpty(errorPart)) {
                fail("parse exception expected");
            }
        } catch (SAXException e) {
            assertTrue("SAXParseException expected", e instanceof SAXParseException);
            assertTrue(String.format("failure message expected to match [%s]. message string [%s]",errorPart,e.getMessage()),
                    e.getMessage().contains(errorPart));
        }
    }
}