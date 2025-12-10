package com.semafone.tndispatcher.utils;

import com.semafone.tndispatcher.TestApplication;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;
import org.xml.sax.SAXException;

import java.io.IOException;

import static org.junit.Assert.fail;

@RunWith(SpringJUnit4ClassRunner.class)
@SpringBootTest(classes = TestApplication.TestApplication2.class)
public class NoOpXsdValidationTest{
    @Autowired
    private XsdValidation csRequestValidator;

    @BeforeClass
    public static void beforeClass(){
        System.setProperty("semafone.schema.validation.disabled", "true");
    }
    @AfterClass
    public static void afterClass(){
        System.clearProperty("semafone.schema.validation.disabled");
    }

    @Test
    public void shouldAllowInvalidBodyWhenValidationDisabled() throws IOException {
        String errorPart = "element 'ccSomeService'";
        final String requestFilePath = "tokenizationRequest-invalidOp.xml";
        try {
            csRequestValidator.validate(FileUtils.getFileContentAsString(requestFilePath));
        } catch (SAXException e) {
            fail("NoOpXsdValidation should not validate request");
        }
    }
}