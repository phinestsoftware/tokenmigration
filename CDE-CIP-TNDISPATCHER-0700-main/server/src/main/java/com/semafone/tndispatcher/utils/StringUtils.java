package com.semafone.tndispatcher.utils;

import static com.semafone.tndispatcher.constants.Constants.MASK_CHARACTER;

public class StringUtils {
    private StringUtils(){}

    public static String maskString(String input, CharBufferFormatStyle formatStyle) throws IllegalArgumentException {
        if (input == null) {
            return null;
        }

        int length = input.length();

        return switch (formatStyle) {
            case NONE -> input;
            case FIRST_6_LAST_4 -> maskFirstNLast(input, 6, 4);
            case FIRST_6_LAST_3 -> maskFirstNLast(input, 6, 3);
            case FIRST_6_LAST_2 -> maskFirstNLast(input, 6, 2);
            case FIRST_6_LAST_1 -> maskFirstNLast(input, 6, 1);
            case FIRST_6_ONLY -> input.substring(0, Math.min(length, 6));
            case FIRST_4_LAST_4 -> maskFirstNLast(input, 4, 4);
            case FIRST_4_LAST_3 -> maskFirstNLast(input, 4, 3);
            case FIRST_4_LAST_2 -> maskFirstNLast(input, 4, 2);
            case FIRST_4_LAST_1 -> maskFirstNLast(input, 4, 1);
            case FIRST_4_ONLY -> input.substring(0, Math.min(length, 4));
            case LAST_4 -> input.substring(Math.max(0, length - 4));
            case LAST_3 -> input.substring(Math.max(0, length - 3));
            case LAST_2 -> input.substring(Math.max(0, length - 2));
            case LAST_1 -> input.substring(Math.max(0, length - 1));
            case CLEAR -> MASK_CHARACTER.repeat(length);
            default -> throw new IllegalArgumentException( "Error occurred while masking!");
        };
    }

    private static String maskFirstNLast(String input, int firstCount, int lastCount) {
        int length = input.length();

        return input.substring(0, Math.min(length, firstCount)) + // Append first characters
                MASK_CHARACTER.repeat(Math.max(0, length - lastCount - firstCount)) + // Mask middle characters
                input.substring(Math.max(0, length - lastCount), length); // Append last characters
    }

}
