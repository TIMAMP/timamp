<?php
//globals:
$stats = new stdClass();
$date = (isset($_GET['date']))? $_GET['date'] : "2013-04-05";

/**
 * This function creates all window frames for a given date
 * @param  string  $date           date in yyyy-mm-dd format
 * @param  integer $duration       duration of the window in minutes
 * @param  integer $deltaStartTime interval between 2 window frames in minutes
 * @return array   array of all windows for the given date
 */
function createWindows($date, $duration, $deltaStartTime){
	$startTime = "$date 00:00:00";
	$endDayTime = "$date 23:59:59";
	$windows;
	$i = 0;
    
	while(strtotime($startTime) < strtotime($endDayTime)){
		$currentDate = strtotime($startTime);
		$futureDate = $currentDate+(60*$duration);
		$endWindowTime = date("Y-m-d H:i:s", $futureDate);
		$windows[$i][0] = $startTime;
		$windows[$i][1] = $endWindowTime;
		$futureDate = $currentDate+(60*$deltaStartTime);
		$endWindowTime = date("Y-m-d H:i:s", $futureDate);
		$startTime = $endWindowTime;
		$i++;
	}
	return $windows;
}

/**
 * Loads all data for a given date
 * @param string $date the given date in yyyy-mm-dd format
 */
function loadData($date){
    global $stats;
    
    $data = new stdClass();
    $data->startTime = $date.'T00:00:00Z';
    $data->windowDuration = 20;
    $data->deltaStartTime = 5;
    $data->radars = array("6234", "6260", "6410", "6451", "6477");
    $data->altitudes = array();
    $data->xPositions = array(4.7899, 5.1783, 3.0654, 4.451, 5.5045);
    $data->yPositions = array(52.9533, 52.1017, 51.1927, 50.901, 49.914);
    $data->densities = array();
    $data->uSpeeds = array();
    $data->vSpeeds = array();
    $data->speeds = array();
    
    $altMin = 0.3;
    $altMax = 3.9;
    for( $i = $altMin ; $i < $altMax+0.2 ; $i += 0.2 ){
        $data->altitudes[] = $i;
    }
    
	$windows = createWindows($date, $data->windowDuration, $data->deltaStartTime);
    $altitudes = $data->altitudes;
    $radars = $data->radars;
    
    
    $stats->rowCount = 0;
    $stats->windowCount = count($windows);
    
    
	$table = 'bird_migration_altitude_profiles';
//	$con = mysqli_connect('enram.dev', 'root', '', 'enram');
	$con = mysqli_connect('enram-hackaton.dev', 'root', '', 'enram');

    foreach($windows as $window){
        
        $sql = "SELECT radar_id, altitude";
        $sql .= ", AVG(bird_density) as bird_density";
        $sql .= ", AVG(u_speed) as u_speed";
        $sql .= ", AVG(v_speed) as v_speed";
        //$sql .= ", AVG(ground_speed) as ground_speed";
        $sql .= " FROM bird_migration_altitude_profiles";
        $sql .= " WHERE altitude >= '$altMin'";
        $sql .= " AND altitude <= '$altMax'";
        $sql .= " AND bird_density > 0";
        $sql .= " AND start_time BETWEEN '$window[0]' AND '$window[1]'";
        $sql .= " GROUP BY altitude, radar_id";
        
        //echo "<p>$sql</p>";
        
        $result = mysqli_query($con, $sql) or die(mysql_error());
        $stats->rowCount += mysqli_num_rows($result);
        
        $windowData = new stdClass(); //create empty object
        $windowData->densities = array();
        $windowData->uSpeeds = array();
        $windowData->vSpeeds = array();
        $windowData->speeds = array();
        
        foreach( $altitudes as $altitude ){
            $windowData->densities[] = array(0,0,0,0,0); //create a default density array in this window for all altitudes
            $windowData->uSpeeds[] = array(0,0,0,0,0); //create a default uSpeed array in this window for all altitudes
            $windowData->vSpeeds[] = array(0,0,0,0,0); //create a default vSpeed array in this window for all altitudes
            $windowData->speeds[] = array(0,0,0,0,0); //create a default speed array in this window for all altitudes
        }
        
        while($row = mysqli_fetch_array($result)){
            $radarIndex = 0;
            $altitudeIndex = 0;
            $radar_id = intval($row[0]);
            $altitude = floatval($row[1]);
            $bird_density = floatval($row[2]);
            $u_speed = floatval($row[3]);
            $v_speed = floatval($row[4]);
            $altitudeIndex = ($altitude * 10 - 3) / 2;
            
            foreach($radars as $radar){
                if($radar_id == $radar) break;
                $radarIndex++;
            }
            
            $windowData->densities[$altitudeIndex][$radarIndex] = $bird_density;
            $windowData->uSpeeds[$altitudeIndex][$radarIndex] = $u_speed;
            $windowData->vSpeeds[$altitudeIndex][$radarIndex] = $v_speed;
            $speed = sqrt($u_speed * $u_speed + $v_speed * $v_speed);
            $windowData->speeds[$altitudeIndex][$radarIndex] = $speed;
        }
        
        $data->densities[] = $windowData->densities;
        $data->uSpeeds[] = $windowData->uSpeeds;
        $data->vSpeeds[] = $windowData->vSpeeds;
        $data->speeds[] = $windowData->speeds;
    }
    
	mysqli_close($con);
    
    return $data;
}

function exportJSON($filename, $data){
    global $stats;
    
	$fh = fopen($filename, "w");
    fwrite($fh, json_encode($data, JSON_PRETTY_PRINT));
    fclose($fh);
    
    $stats->result = json_encode($data, JSON_PRETTY_PRINT);
}

$startTime = microTime(true);
$data = loadData($date);
$loadTime = microTime(true);
exportJSON("data/enram-data-$date.json", $data);
$endTime = microTime(true);
$stats->loadExecutionTime = $loadTime - $startTime;
$stats->exportExecutionTime = $endTime - $loadTime;

echo '<h1>Enram Data preprocessor</h1><h2>Stats:</h2><ul>';
echo '<li>Date: ' . $date . ' </li>';
echo '<li>Number of windows: ' . $stats->windowCount . ' windows</li>';
echo '<li>Number of rows: ' . $stats->rowCount . ' rows</li>';
echo '<li>Execution time query + transform data: ' . $stats->loadExecutionTime . ' sec</li>';
echo '<li>Execution time export JSON file: ' . $stats->exportExecutionTime . ' sec</li></ul>';
echo '<h2>Result:</h2><p><pre> ' . $stats->result . '</pre></p>';
?>