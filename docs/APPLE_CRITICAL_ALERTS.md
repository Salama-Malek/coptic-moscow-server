# Apple Critical Alerts Entitlement

Critical Alerts bypass Do Not Disturb and the mute switch on iOS. This is ideal for urgent church announcements but requires Apple's explicit approval.

## When Do You Need This?

Only if you want `priority=critical` notifications to make sound even when the user's phone is on silent/DND. Without this entitlement, critical notifications will still be delivered but will respect the user's sound settings.

## How to Request

1. Go to [Apple Developer — Request Entitlements](https://developer.apple.com/contact/request/notifications-critical-alerts-entitlement/)

2. Fill out the form:

   - **App Name:** Coptic Church Moscow
   - **App Store URL or Bundle ID:** `church.copticmoscow.app`
   - **Describe the critical information your app conveys:**

     > Our app serves the Coptic Orthodox parish in Moscow, Russia. It delivers time-sensitive notifications for liturgical services, schedule changes, and urgent pastoral announcements from the parish priest to parishioners. Critical alerts are used sparingly and only for same-day service changes or emergency pastoral communications that parishioners must receive regardless of their phone's sound settings.

   - **Why is this information critical to the user's health or safety?**

     > While not a health/safety app, our use case aligns with Apple's guidelines for religious community notifications. Same-day cancellations of services (due to weather, illness, or facility issues) require immediate notification to prevent parishioners from traveling unnecessarily — particularly important in Moscow's severe winter conditions.

3. Submit and wait for Apple's review (typically 1-2 weeks)

## After Approval

1. In Apple Developer Portal → **Certificates, Identifiers & Profiles** → **Identifiers**
2. Select `church.copticmoscow.app`
3. Enable **Critical Alerts** capability
4. Regenerate your provisioning profile
5. In Xcode, add the `com.apple.developer.usernotifications.critical-alerts` entitlement

## Without the Entitlement

The app works fine without it. Critical notifications will:
- Still be delivered as high-priority
- Still use the `time-sensitive` interruption level
- Still show on the lock screen
- But will respect the user's mute switch and DND settings

The `bell.caf` custom sound will play for non-critical high-priority notifications.
