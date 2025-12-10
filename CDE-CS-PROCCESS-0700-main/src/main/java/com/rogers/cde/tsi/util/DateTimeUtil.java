package com.rogers.cce.creditoption.util;

import java.sql.Timestamp;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.util.Date;

import static com.rogers.cce.creditoption.constants.StringConstants.DATE_FORMAT;

public class DateTimeUtil {

    public static String getDateFormat(Timestamp timestamp) {
        DateFormat df = new SimpleDateFormat(DATE_FORMAT);
        String text = df. format(timestamp);
        return text;
    }

    public static Timestamp getCurrentDateTimeStamp() {
        LocalDate localDate = LocalDate.now();
        return convertToTimeStamp(localDate.toString() + " 00:00:00");
    }

    public static Timestamp convertToTimeStamp(String dateTime) {
        // dateTime ex. 2006-01-25 2:44:00
        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        Timestamp datetime = null;
        try {
            datetime = new Timestamp(formatter.parse(dateTime).getTime());
        } catch (ParseException parseException) {
            parseException.printStackTrace();
        }
        return datetime;
    }

}
