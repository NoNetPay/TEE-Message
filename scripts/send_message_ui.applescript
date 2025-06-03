
  -- Fixed UI-Based SMS Sending Script
  -- This script correctly handles the Messages app interface
  
  on run argv
    if (count of argv) < 2 then
      return "Error: Required parameters are missing. Usage: osascript send_message_ui.applescript phoneNumber message"
    end if
    
    set recipientNumber to item 1 of argv
    set messageText to item 2 of argv
    
    tell application "Messages"
      activate
      delay 1
    end tell
    
    tell application "System Events"
      tell process "Messages"
        -- Create a new message with Command+N
        keystroke "n" using {command down}
        delay 1
        
        -- Type the recipient number
        keystroke recipientNumber
        delay 1

        keystroke return
        
        -- Press Tab to move to the message field
        keystroke tab
        delay 0.5
        
        -- Type the message text
        keystroke messageText
        delay 0.5
        
        -- Send the message with Return
        keystroke return
        
        -- Wait a moment to ensure it's sent
        delay 1
      end tell
    end tell
    
    return "Message sent to " & recipientNumber & " using UI automation"
  end run
  