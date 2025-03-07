serve:
  npm run start

install:
  cp ./com.inclouds.apricot.plist /Users/charles/Library/LaunchAgents/com.inclouds.apricot.plist

reload: unload load sleep list
restart: reload

unload:
  launchctl unload /Users/charles/Library/LaunchAgents/com.inclouds.apricot.plist || true
stop: unload

load:
  launchctl load /Users/charles/Library/LaunchAgents/com.inclouds.apricot.plist
start: load

sleep:
  sleep 0.1

list:
  launchctl list | grep inclouds
