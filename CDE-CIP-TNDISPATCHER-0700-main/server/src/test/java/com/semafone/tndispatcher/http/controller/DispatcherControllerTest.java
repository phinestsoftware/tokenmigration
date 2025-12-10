package com.semafone.tndispatcher.http.controller;

import com.google.common.base.Joiner;
import com.semafone.tndispatcher.TestApplication;
import com.semafone.tndispatcher.constants.Constants;
import org.junit.Ignore;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@RunWith(SpringJUnit4ClassRunner.class)
@AutoConfigureMockMvc
@SpringBootTest(classes = TestApplication.class, webEnvironment = SpringBootTest.WebEnvironment.MOCK)
public class DispatcherControllerTest {
    @Autowired
    private MockMvc mvc;

    @Test
    @Ignore
    public void shouldPassOnCorrectTokeniseCall() throws Exception {
        final String url = Joiner.on('/').join(Constants.DISPATCH_CONTROLLER_API, Constants.DISPATCH_CONTROLLER_DISPATCH);
        this.mvc.perform(get(url).accept(MediaType.TEXT_XML))
                .andExpect(status().isOk())
                .andExpect(content().string(contains("<faultcode>env:Client</faultcode>")));
    }


}