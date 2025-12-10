package com.semafone.tndispatcher.utils;

import com.jayway.jsonpath.JsonPath;
import org.junit.Assert;

import java.util.Map;

public class DataMatchingUtil {

    public static void validateBodyPath(String responseBodyJson, String jsonPath, Map<String, Object> expectedContent) {
        Map<String, Object> subTree = JsonPath.read(responseBodyJson, jsonPath);
        validateDataAgainstResponse(expectedContent, subTree);
    }

    public static void validateDataAgainstResponse(Map<String, Object> dataMap, Map<String, Object> jsonObject) {
        for (Map.Entry<String, Object> mapEntry : dataMap.entrySet()) {
            String key = mapEntry.getKey();
            Object expected = mapEntry.getValue();
            Object actual = getValue(key, jsonObject);
            if (expected == null || expected.toString().isEmpty()) {
                Assert.assertTrue(String.format("Value for key [%s] expected null or empty, but is [%s]", key, actual), (actual == null) || actual.toString().isEmpty());
            } else {
                Assert.assertEquals(String.format("expected %s = [%s], was [%s]", key, expected, String.valueOf(actual)), expected, actual == null ? "[null]" : actual.toString());
            }
        }
    }

    private static Object getValue(String key, Map<String, Object> value) {
        String[] split = key.split("\\.");
        int i = 0;
        Map<String, Object> nested = value;
        while (i < split.length - 1) {
            final Object o = nested.get(split[i++]);
            if(o!= null && Map.class.isAssignableFrom(o.getClass())) {
                nested = (Map<String, Object>) o;
            } else {
                return null;
            }
        }
        return nested.get(split[i]);
    }
}
