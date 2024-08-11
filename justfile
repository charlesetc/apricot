serve:
  npm run start

install:
  cp ./com.inclouds.apricot.plist /Users/charles/Library/LaunchAgents/com.inclouds.apricot.plist

restart: unload load sleep list

unload:
  launchctl unload /Users/charles/Library/LaunchAgents/com.inclouds.apricot.plist || true

load:
  launchctl load /Users/charles/Library/LaunchAgents/com.inclouds.apricot.plist

sleep:
  sleep 0.1

list:
  launchctl list | grep inclouds
