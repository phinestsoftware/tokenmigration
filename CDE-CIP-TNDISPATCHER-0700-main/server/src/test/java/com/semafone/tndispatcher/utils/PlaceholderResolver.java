package com.semafone.tndispatcher.utils;

import com.google.common.base.Function;
import com.google.common.collect.Lists;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class PlaceholderResolver {

        private static final Pattern default_placeholderPattern = Pattern.compile("(@\\{)(.*?)(})");
        private static final int default_placeholderGroupIndex=2;
        private final Pattern placeholderPattern;
        private final int placeholderGroupIndex;

    public PlaceholderResolver() {
        this.placeholderPattern = default_placeholderPattern;
        this.placeholderGroupIndex = default_placeholderGroupIndex;
    }
    public PlaceholderResolver(String pattern, int placeholderGroupIndex) {
        this.placeholderPattern = Pattern.compile(pattern);
        this.placeholderGroupIndex = placeholderGroupIndex;
    }


    public String resolveTemplate(String template, Map<String,Object> placeHolderValueMap) {
            String resolvedTemplate = resolveTemplateVars(template, p -> placeHolderValueMap.get(p));
            return resolvedTemplate;
        }
        private String resolveTemplateVars(String template, Function<String, Object> pathValueResolver) {
            Matcher matcher = placeholderPattern.matcher(template);
            StringBuffer resolvedTemplate = new StringBuffer();
            while (matcher.find()) {
                String placeholder= (matcher.group(placeholderGroupIndex));
                final Object oValue = pathValueResolver.apply(placeholder);
                matcher.appendReplacement(resolvedTemplate, oValue == null ? "" : String.valueOf(oValue));
            }
            matcher.appendTail(resolvedTemplate);

            return resolvedTemplate.toString();
        }
    public List<String> getPlaceholders(String template) {
        List<String> placeholders= Lists.newArrayList();
        final Matcher matcher = placeholderPattern.matcher(template);
        while(matcher.find()){
            placeholders.add(matcher.group(placeholderGroupIndex));
        }
        return placeholders;
    }
}
