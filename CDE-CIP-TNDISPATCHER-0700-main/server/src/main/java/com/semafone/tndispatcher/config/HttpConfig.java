package com.semafone.tndispatcher.config;

import com.google.common.base.Throwables;
import com.semafone.tndispatcher.http.service.HttpService;
import com.semafone.tndispatcher.http.service.HttpServiceFactory;
import lombok.extern.slf4j.Slf4j;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.client5.http.ssl.NoopHostnameVerifier;
import org.apache.hc.client5.http.ssl.SSLConnectionSocketFactory;
import org.apache.hc.client5.http.ssl.SSLConnectionSocketFactoryBuilder;
import org.apache.hc.client5.http.ssl.TrustAllStrategy;
import org.apache.hc.core5.ssl.SSLContextBuilder;
import org.apache.hc.core5.util.TimeValue;
import org.apache.hc.core5.util.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.DefaultResponseErrorHandler;
import org.springframework.web.client.RestTemplate;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.security.KeyManagementException;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Configuration
@Slf4j
public class HttpConfig {
    private final boolean allowUntrustedCertificates;

    private int maxConnTotal;

    private int maxConnPerRoute;

    private long connectionTimeToLive;

    private int requestConnTimeOut;

    private int connectTimeOut;
    
    private int readTimeOut;

    private List<String> noCertificateValidationUrlPrefixes;

    @Autowired
    private HttpServiceFactory httpServiceFactory;
    
    private static final TrustManager[] UNQUESTIONING_TRUST_MANAGER = new TrustManager[] {
                    new X509TrustManager() {
                        public X509Certificate[] getAcceptedIssuers() {
                            return new X509Certificate[0];
                        }

                        public void checkClientTrusted(X509Certificate[] certs, String authType) {
                            // Empty - trust all clients
                        }

                        public void checkServerTrusted(X509Certificate[] certs, String authType) {
                            // Empty - trust all servers
                        }
                    }
            };


    @Autowired
    public HttpConfig(ApplicationContext applicationContext,
                      @Value("${semafone.http.max.connections}") int maxConnTotal,
                      @Value("${semafone.http.request.connection.timeout.millis}") int requestConnTimeOut,
                      @Value("${semafone.http.request.read.timeout.millis:5000}") int readTimeOut,
                      @Value("${semafone.https.certificate.allowUntrusted}") boolean allowUntrustedCertificates,
                      @Value("${semafone.https.certificate.skipValidationFor}") String[] noCertificateValidationUrlPrefixes,
                      @Value("${semafone.http.max.connections.per.route:0}") int maxConnPerRoute,
                      @Value("${semafone.http.connection.timetolive.millis:5000}") long connectionTimeToLive,
                      @Value("${semafone.http.connect.timeout.millis:2000}") int connectTimeOut) {
        
        this.allowUntrustedCertificates = allowUntrustedCertificates;
        this.noCertificateValidationUrlPrefixes = noCertificateValidationUrlPrefixes == null || noCertificateValidationUrlPrefixes.length == 0
                ? Collections.emptyList()
                : Collections.unmodifiableList(Arrays.asList(noCertificateValidationUrlPrefixes));
        this.maxConnTotal = maxConnTotal;
        this.maxConnPerRoute = maxConnPerRoute > 0 ? maxConnPerRoute : maxConnTotal;
        this.connectionTimeToLive = connectionTimeToLive;
        this.requestConnTimeOut = requestConnTimeOut;
        this.readTimeOut = readTimeOut;
        this.connectTimeOut = connectTimeOut;
        
        logHttpConfig();
    }

    private void logHttpConfig() {
        log.info("HttpConfig:");
        log.info("allowUntrustedCertificates: {}", this.allowUntrustedCertificates);
        log.info("noCertificateValidationUrlPrefixes: {}", this.noCertificateValidationUrlPrefixes);
        log.info("maxConnTotal: {}", this.maxConnTotal);
        log.info("maxConnPerRoute: {}", this.maxConnPerRoute);
        log.info("connectionTimeToLive: {}", this.connectionTimeToLive);
        log.info("requestConnTimeOut: {}", this.requestConnTimeOut);
        log.info("readTimeOut: {}", this.readTimeOut);
        log.info("connectTimeOut: {}", this.connectTimeOut);
    }

    private CloseableHttpClient httpClient() throws KeyManagementException, NoSuchAlgorithmException {



        /*SSLConnectionSocketFactory sslConnectionSocketFactory = new SSLConnectionSocketFactory(
                SSLContexts.custom().loadTrustMaterial(null, new TrustSelfSignedStrategy()).build(),
                SSLConnectionSocketFactory.ALLOW_ALL_HOSTNAME_VERIFIER);*/
        SSLContext sslContext = null;
        try {
            sslContext = SSLContextBuilder.create()
                    .loadTrustMaterial(TrustAllStrategy.INSTANCE)
                    .build();


        SSLConnectionSocketFactory sslsf = SSLConnectionSocketFactoryBuilder.create().setSslContext(sslContext)
                .setHostnameVerifier(NoopHostnameVerifier.INSTANCE).build();

        PoolingHttpClientConnectionManagerBuilder connectionManagerBuilder = PoolingHttpClientConnectionManagerBuilder.create()
                .setSSLSocketFactory(sslsf)
                .setMaxConnTotal(maxConnTotal)
                .setMaxConnPerRoute(maxConnPerRoute);

        if (allowUntrustedCertificates) {
            log.warn("SECURITY WARNING. Allowing not trusted certificates for [{}]", Arrays.toString(noCertificateValidationUrlPrefixes.toArray()));
            connectionManagerBuilder.setSSLSocketFactory(sslsf);
        }

        RequestConfig requestConfig = RequestConfig.custom()
                    .setResponseTimeout(Timeout.ofMilliseconds(readTimeOut)) // Set the read timeout in milliseconds
                    .build();

        CloseableHttpClient httpclient = HttpClients.custom()
                .evictExpiredConnections()
                .evictIdleConnections(TimeValue.ofMilliseconds(connectionTimeToLive))
                .setConnectionManager(connectionManagerBuilder.build())
                .setDefaultRequestConfig(requestConfig)
                .build();
            return httpclient;
        } catch (KeyStoreException e) {
            throw new RuntimeException(e);
        }


    }

    private RequestConfig requestConfig() {
        return RequestConfig.custom()
                            .setConnectTimeout(Timeout.ofMilliseconds(connectTimeOut))
                            .setConnectionRequestTimeout(Timeout.ofMilliseconds(requestConnTimeOut)).build();
    }

    @Bean(name = "customRestTemplate")
    public RestTemplate restTemplate() {
        RestTemplate template = new RestTemplate(requestFactory());
        template.setErrorHandler(new DefaultResponseErrorHandler());
        return template;
    }

    @Bean(name = "httpService")
    public HttpService httpService() {
        return httpServiceFactory.create(HttpServiceFactory.APPLICATION_XML);
    }

    private ClientHttpRequestFactory requestFactory() {
        try {

        	HttpComponentsClientHttpRequestFactory requestFactory = new HttpComponentsClientHttpRequestFactory(httpClient());
        	//requestFactory.setReadTimeout(readTimeOut);
        	return requestFactory;
        } catch (KeyManagementException | NoSuchAlgorithmException e) {
            throw Throwables.propagate(e);
        }
    }

    private static SSLContext nonCheckingSSLContext() throws NoSuchAlgorithmException, KeyManagementException {
        final SSLContext sc = SSLContext.getInstance("TLS");
        sc.init(null, UNQUESTIONING_TRUST_MANAGER, null);
        return sc;
    }
}
