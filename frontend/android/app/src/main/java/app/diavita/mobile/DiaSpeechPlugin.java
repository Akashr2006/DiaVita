package app.diavita.mobile;

import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Tells the app what this phone offers for voice input, so it never waits on a speech window that does not exist.
@CapacitorPlugin(name = "DiaSpeech")
public class DiaSpeechPlugin extends Plugin {

    @PluginMethod
    public void check(PluginCall call) {
        Context context = getContext();
        Intent window = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        JSObject result = new JSObject();
        result.put("speechWindow", window.resolveActivity(context.getPackageManager()) != null);
        result.put("defaultService", Settings.Secure.getString(context.getContentResolver(), "voice_recognition_service"));
        call.resolve(result);
    }
}
