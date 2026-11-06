package com.hermes.panel;

import org.schabi.newpipe.extractor.downloader.Downloader;
import org.schabi.newpipe.extractor.downloader.Request;
import org.schabi.newpipe.extractor.downloader.Response;
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.RequestBody;
import okhttp3.ResponseBody;

/** Descargador HTTP (OkHttp) que NewPipeExtractor necesita para hablar con YouTube. */
public final class NpDownloader extends Downloader {
    private static final String USER_AGENT =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0";
    private static NpDownloader instance;
    private final OkHttpClient client;

    private NpDownloader() {
        client = new OkHttpClient.Builder()
            .readTimeout(25, TimeUnit.SECONDS)
            .connectTimeout(15, TimeUnit.SECONDS)
            .build();
    }

    public static synchronized NpDownloader get() {
        if (instance == null) instance = new NpDownloader();
        return instance;
    }

    @Override
    public Response execute(Request request) throws IOException, ReCaptchaException {
        final String method = request.httpMethod();
        final String url = request.url();
        final Map<String, List<String>> headers = request.headers();
        final byte[] data = request.dataToSend();

        RequestBody body = null;
        if (data != null) body = RequestBody.create(data);

        final okhttp3.Request.Builder rb = new okhttp3.Request.Builder()
            .method(method, body)
            .url(url)
            .addHeader("User-Agent", USER_AGENT);

        for (Map.Entry<String, List<String>> e : headers.entrySet()) {
            rb.removeHeader(e.getKey());
            for (String v : e.getValue()) rb.addHeader(e.getKey(), v);
        }

        try (okhttp3.Response res = client.newCall(rb.build()).execute()) {
            if (res.code() == 429) throw new ReCaptchaException("reCaptcha Challenge requested", url);
            String text = null;
            try (ResponseBody rbody = res.body()) {
                if (rbody != null) text = rbody.string();
            }
            return new Response(res.code(), res.message(), res.headers().toMultimap(), text, res.request().url().toString());
        }
    }
}
