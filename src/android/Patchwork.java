package com.rjfun.cordova.httpd;

import java.io.IOException;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.Enumeration;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;
import org.apache.cordova.PluginResult.Status;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.util.Log;
import android.content.Context;
import android.content.res.AssetManager;

/**
 * This class starts and stops the patchwork node process.
 */
public class Patchwork extends CordovaPlugin {

    /** Common tag used for logging statements. */
    private static final String LOGTAG = "Patchwork";
    
    /** Cordova Actions. */
    private static final String ACTION_START_SERVER = "startServer";
    private static final String ACTION_STOP_SERVER = "stopServer";

    private String www_root = "";
    private Process p;

    @Override
    public boolean execute(String action, JSONArray inputs, CallbackContext callbackContext) throws JSONException {
        PluginResult result = null;
        if (ACTION_START_SERVER.equals(action)) {
            result = startServer(inputs, callbackContext);
        } else if (ACTION_STOP_SERVER.equals(action)) {
            result = stopServer(inputs, callbackContext);
        } else {
            Log.d(LOGTAG, String.format("Invalid action passed: %s", action));
            result = new PluginResult(Status.INVALID_ACTION);
        }

        if (result != null) callbackContext.sendPluginResult( result );

        return true;
    }
    

    private PluginResult startServer(JSONArray inputs, CallbackContext callbackContext) {
      String res = new String();
      Log.w(LOGTAG, "startServer");
      try {
        String line;
        p = Runtime.getRuntime().exec("/system/bin/find .");
        BufferedReader input = new BufferedReader (new InputStreamReader(p.getInputStream()));
        while ((line = input.readLine()) != null) {
          res = res + line;
        }
        input.close();
      }
      catch (Exception err) {
        err.printStackTrace();
      }      

      delayCallback.success(res);

      return null;

      // final CallbackContext delayCallback = callbackContext;
      // cordova.getActivity().runOnUiThread(new Runnable(){
      //   @Override
      //   public void run() {
      //     String errmsg = __startServer();
      //     if (errmsg.length() > 0) {
      //     delayCallback.error( errmsg );
      //   } else {
      //     if (localhost_only) {
      //       url = "http://127.0.0.1:" + port;
      //     } else {
      //       url = "http://" + __getLocalIpAddress() + ":" + port;
      //     }
      //       delayCallback.success( url );
      //     }
      //   }
      // });
    }
    
    private PluginResult stopServer(JSONArray inputs, CallbackContext callbackContext) {
      Log.w(LOGTAG, "stopServer");

      p.destroy();

      final CallbackContext delayCallback = callbackContext;
      cordova.getActivity().runOnUiThread(new Runnable(){
        @Override
        public void run() {
          delayCallback.success();
        }
      });
      return null;
    }

    /**
     * Called when the system is about to start resuming a previous activity.
     *
     * @param multitasking		Flag indicating if multitasking is turned on for app
     */
    public void onPause(boolean multitasking) {
    	//if(! multitasking) __stopServer();
    }

    /**
     * Called when the activity will start interacting with the user.
     *
     * @param multitasking		Flag indicating if multitasking is turned on for app
     */
    public void onResume(boolean multitasking) {
    	//if(! multitasking) __startServer();
    }

    /**
     * The final call you receive before your activity is destroyed.
     */
    public void onDestroy() {
    	__stopServer();
    }
}
