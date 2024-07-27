<#
.SYNOPSIS
Makes a br0nson dance on your shell.
.EXAMPLE
./br0nson-dance.ps1
#>

$request = [System.Net.HttpWebRequest]::Create("http://br0nson.live");
$response = $request.GetResponse();
$receiveStream = $response.GetResponseStream();
$readStream = [System.IO.StreamReader]::new($receiveStream);

[console]::TreatControlCAsInput = $true;
$initialForegroundColor = [Console]::ForegroundColor;
while ($line = $readStream.ReadLine()) {
  if ([Console]::KeyAvailable) {
    $key = [System.Console]::ReadKey($true)
    if (($key.modifiers -band [ConsoleModifiers]"control") -and ($key.key -eq "C"))
    {
      break;
    }
  }

  [Console]::WriteLine($line);
}

$readStream.Close();
$receiveStream.Close();
$request.Abort();
[console]::TreatControlCAsInput = $false;
[Console]::ForegroundColor = $initialForegroundColor;
