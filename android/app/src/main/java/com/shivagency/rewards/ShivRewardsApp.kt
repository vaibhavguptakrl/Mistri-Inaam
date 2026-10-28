package com.shivagency.rewards

import android.app.Application
import com.google.firebase.FirebaseApp

class ShivRewardsApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize Firebase
        FirebaseApp.initializeApp(this)
    }
}
