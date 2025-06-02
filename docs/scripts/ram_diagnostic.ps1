[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ASCII Banner
Write-Host @"
██████╗  █████╗ ███╗   ███╗     ███████╗ █████╗ ███╗   ██╗████████╗███████╗
██╔══██╗██╔══██╗████╗ ████║     ██╔════╝██╔══██╗████╗  ██║╚══██╔══╝██╔════╝
██████╔╝███████║██╔████╔██║     ███████╗███████║██╔██╗ ██║   ██║   █████╗  
██╔██╗  ██╔══██║██║╚██╔╝██║     ╔══╝ ██║██╔══██║██║╚██╗██║   ██║   ██╔══╝  
██║╚███╗██║  ██║██║ ╚═╝ ██║     ███████║██║  ██║██║ ╚████║   ██║   ███████╗
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝

                >>>  A N A L Y S E   M É M O I R E  <<<
"@ -ForegroundColor Green

# Variables
$slotsOccupes = @()
$slotsVides = @()

# Infos système
$memoryChips = Get-CimInstance -ClassName Win32_PhysicalMemory
$physArray = Get-CimInstance -ClassName Win32_PhysicalMemoryArray
$baseBoard = Get-CimInstance -ClassName Win32_BaseBoard

$maxCapacityGB = [math]::Round($physArray.MaxCapacity * 1024 / 1GB, 2) # MaxCapacity	Capacité mémoire maximale supportée par l’ensemble du système (en KB)
$slotCount = $physArray.MemoryDevices
$maxPerSlotGB = if ($slotCount -ne 0) { [math]::Round($maxCapacityGB / $slotCount, 2) } else { "Inconnu" }


# Récupération des slots occupés
$deviceLocators = @()
foreach ($chip in $memoryChips) {
    $capacityGB = [math]::Round($chip.Capacity / 1GB, 2)
    $formFactor = switch ($chip.FormFactor) {
        8 { "OnBoard (soudée)" }
        9 { "DIMM" }
        12 { "SO-DIMM" }
        0 { "Non spécifié" }
        default { "Autre ($($_))" }
    }

    $slotsOccupes += [pscustomobject]@{	
        Slot                    = $chip.DeviceLocator 	# Nom du slot mémoire
		BankLabel               = $chip.BankLabel		# Emplacement logique ou nom du canal (ex: "BANK 0")
        Occupe                  = "Oui"
        Type                    = $formFactor
        Capacite_Installee_Go   = $capacityGB
        Capacite_Max_Slot_Go    = $maxPerSlotGB
		# SMBIOSMemoryType		= $chip.SMBIOSMemoryType		# Type mémoire : DDR, DDR2, DDR3, DDR4, etc.
		# Largeur_bus			= $chip.DataWidth / $chip.TotalWidth # DataWidth / TotalWidth	Largeur du bus mémoire (ex: 64 bits)
        Frequence_MHz           = $chip.Speed
        ConfiguredClockSpeed    = $chip.ConfiguredClockSpeed	# ConfiguredClockSpeed	Fréquence effective utilisée (si différente de Speed)
        Marque                  = $chip.Manufacturer
        Modele                  = $chip.PartNumber.Trim()
        Reference_Barette       = $chip.SerialNumber
        CAS_Latency             = $chip.ConfiguredClockSpeed
    }

    $deviceLocators += $chip.DeviceLocator
}

# Estimation des slots vides (basée sur canaux connus ou alternance)
$deviceLocators = $deviceLocators | Sort-Object -Unique
$patternedSlots = $deviceLocators | Where-Object { $_ -match 'Channel([A-Z])-DIMM(\d+)' }

$channelsDetected = ($patternedSlots | ForEach-Object {
    if ($_ -match 'Channel([A-Z])-DIMM(\d+)') { $matches[1] }
}) | Sort-Object -Unique

if ($channelsDetected.Count -eq 0) {
    $channelsDetected = @("A", "B")
}

$index = 0
while (($slotsOccupes.Count + $slotsVides.Count) -lt $slotCount) {
    $channel = $channelsDetected[$index % $channelsDetected.Count]
    $dimmIndex = [math]::Floor($index / $channelsDetected.Count)
    $nomSlot = "Channel$channel-DIMM$dimmIndex"

    if (($deviceLocators -notcontains $nomSlot) -and ($slotsVides | Where-Object { $_.Nom_Attribue -eq $nomSlot }) -eq $null) {
        $slotsVides += [pscustomobject]@{
            Nom_Attribue         = $nomSlot
            Canal_Memoire        = "Channel$channel"
            Occupe               = "Non"
            Type                 = "Vide"
            Capacite_Max_Slot_Go = $maxPerSlotGB
            Frequence_Prevue     = "Voir fiche carte mère"
        }
    }
    $index++
}



# AFFICHAGE

Write-Host "`n=== Nombre de slots physiques présents sur la carte mère ===" -ForegroundColor Cyan
Write-Host "$($slotCount)" -ForegroundColor DarkGray
#Use	Utilisation prévue de cette mémoire (typiquement : 3 = Système)
#Location	Emplacement physique du banc mémoire
#ErrorMethodology	Méthode de détection d’erreur mémoire (parité, ECC, etc.)

Write-Host "`n=== Emplacements mémoire occupés ===" -ForegroundColor Cyan
$slotsOccupes | Sort-Object Slot | Format-Table -AutoSize

Write-Host "`n=== Emplacements mémoire vides (estimés, avec canaux) ===" -ForegroundColor Cyan 
$slotsVides | Sort-Object Nom_Attribue | Format-Table -AutoSize

# INFOS CARTE MÈRE
Write-Host "`nInformations carte mère :" -ForegroundColor Yellow
Write-Host "`tManufacturer: $($baseBoard.Manufacturer)" -ForegroundColor Yellow
Write-Host "`tProduct: $($baseBoard.Product)" -ForegroundColor Yellow
Write-Host "`tSerialNumber: $($baseBoard.SerialNumber)" -ForegroundColor Yellow
Write-Host "`tVersion: $($baseBoard.Version)" -ForegroundColor Yellow
Write-Host "`tPoweredOn: $($baseBoard.PoweredOn)" -ForegroundColor Yellow


# ESTIMATION DUAL CHANNEL
if ($slotsOccupes.Count -eq 2) {
    $sizes = $slotsOccupes | Select-Object -ExpandProperty Capacite_Installee_Go
    $speeds = $slotsOccupes | Select-Object -ExpandProperty Frequence_MHz
    if (($sizes[0] -eq $sizes[1]) -and ($speeds[0] -eq $speeds[1])) {
        Write-Host "`nIl est probable que le Dual Channel soit activé (2 barrettes identiques détectées)." -ForegroundColor Green
    } else {
        Write-Host "`nDeux barrettes détectées, mais non identiques. Dual Channel peu probable." -ForegroundColor Yellow
    }
} elseif ($slotsOccupes.Count -eq 1) {
    Write-Host "`nUne seule barrette détectée. Dual Channel inactif." -ForegroundColor Gray
} elseif ($slotsOccupes.Count -gt 2) {
    Write-Host "`nPlusieurs barrettes détectées. Vérification manuelle recommandée pour le Dual Channel." -ForegroundColor Gray
}
