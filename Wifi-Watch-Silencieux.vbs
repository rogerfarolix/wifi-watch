Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
unpackedExe = currentDir & "\desktop-app\dist\win-unpacked\Wifi-Watch.exe"
portableExe = currentDir & "\desktop-app\dist\Wifi-Watch-Portable.exe"

If fso.FileExists(unpackedExe) Then
    WshShell.Run """" & unpackedExe & """", 1, False
ElseIf fso.FileExists(portableExe) Then
    WshShell.Run """" & portableExe & """", 1, False
Else
    WshShell.CurrentDirectory = currentDir & "\desktop-app"
    WshShell.Run "cmd /c npm start", 0, False
End If
