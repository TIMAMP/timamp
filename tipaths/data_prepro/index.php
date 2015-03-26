<?php

//$array = "2014-03-10T23:55:55Z";
//echo $array . '</br>';
//print_r(return_start_and_stop($array, 25));
function average($sum, $divider){
	$average = $sum/$divider;
	return $average;
}
function return_string_formated($array){
	$aux = str_split($array);
	foreach($aux as $letter){
		if(is_numeric($letter)){
			$string = $string . $letter;
		}
	}
	return $string;
}
function return_start_and_stop($array, $jump){
	$aux = str_split($array);
	foreach($aux as $letter){
		if(is_numeric($letter)){
			$string = $string . $letter;
		}
	}
	$date[0] = $string[2].$string[3]; //year
	$date[1] = $string[4].$string[5]; //month
	$date[2] = $string[6].$string[7]; //day
	$date[3] = $string[8].$string[9]; //hour
	$date[4] = $string[10].$string[11]; //minutes
	$date[5] = $string[12].$string[13]; //second
	$end_date = put_date_right($date, $jump);
	$ret[0] = $string[0].$string[1].$string[2].$string[3] . '-' . $string[4].$string[5]. '-' . $string[6].$string[7]. ' '. $string[8].$string[9]. ':'. $string[10].$string[11]. ':'. $string[12].$string[13];
	$string = $end_date;
	$ret[1] = $string[0].$string[1].$string[2].$string[3] . '-' . $string[4].$string[5]. '-' . $string[6].$string[7]. ' '. $string[8].$string[9]. ':'. $string[10].$string[11]. ':'. $string[12].$string[13];
	return $ret;
}

function put_date_right($date, $jump){
	$date[4] = $date[4] + 25;
	if($date[4] >59){
		$date[4] = $date[4] - 60;
		if($date[4] < 9){
			$date[3] = 0 .$date[4];
		}
		$date[3] += 1;
		if($date[3] < 9){
			$date[3] = 0 .$date[3];
		} else if($date[3] > 23){
				$date[3] = 0 . 0;
				$date[2] += 1;
				if($date[2] < 9){
					$date[2] = 0 .$date[2];
				}
		}
	}
	$date = 20 . implode($date);
	return $date;
	
}


function create_right_file($path){
// radar_name  0, radar_id 1, start_time 2, end_time 3, altitude 4, bird_reflectivity 5, radial_velocity_std 6, u_speed 7, v_speed 8, w_speed 9, ground_speed 10, direction 11, bird_density 12, number_of_bins 13
	$file = fopen("nameofthesourcefile", "r");
	fscanf($file, "%[^\n]", $line);
	
	$myfile = fopen("nameofdestinationfile", "w");
	while(!feof($file)){
	fscanf($myfile, "%[^\n]", $line);
	$array = explode(",", $line);
		$to_wirte = $array[1] . ' ' . $array[2] . ' ' . $array[4] . ' ' . $array[5] . ' ' .  $array[7] . ' ' . $array[8] . ' ' . $array[10] . ' ' . $array[12] . "\n";
		if(floatval($array[6])>2){
			fwrite($myfile, $to_wirte);
		}
	}
	fclose($myfile);
	fclose($file);
}


function make_json_header(){
	$json_file = fopen("files/json.json", "w");
		$to_write="{
					metadata : {
						startTime: '2013-04-05T17:40:12Z',
						windowDuration : 25,
						deltaStartTime : 5,
						radars : [6410, 6234, 6260, 6451, 6477],
						altitudes : [0.1, 0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.1, 3.3, 3.5, 3.7, 3.9, 4.1, 4.3, 4.5, 4.7, 4.9, 5.1, 5.3, 5.5, 5.7, 5.9],
						dataIndices : ['density', 'speed_u', 'speed_v' ]
					},
					data : [";
		fwrite($json_file, $to_wirte);
	fclose($json_file);
	
}

function write_on_file($line){
	$json_file = fopen("files/json.json", "a+");
	fclose($json_file);
}


function json_file($start_time){
	$aux = return_start_and_stop($array, 25);
	$end_time = $aux[1];
	$start_time = $aux[0];
	$myfile = fopen("files/testfile.txt", "r");
	make_json_header();
	$average_speed_u = 0;
	$numer_of_rows = 0;
	$average_density = 0;
	$average_speed_v = 0;
	fscanf($myfile, "%[^\n]", $line);
	while(!feof($file)){
		fscanf($myfile, "%[^\n]", $line);
		$array = explode(" ", $line);
	/*	$test = return_string_formated($array[1]);
		if((strcmp($start_time,$test) <=0 )&& (strcmp($end_time,$test) >= 0)){
			$average_density = $average_density + $array[9];
			while((strcmp($start_time,$test) <=0 )&& (strcmp($end_time,$test) >= 0)){
			
			}
		} else{
			$average_speed_u = 0;
			$average_density = 0;
			$average_speed_v = 0;
		} */
	}
	fclose($myfile);
	
//1st string greater than the second +
//1st string lower than the second +

}

function create_table(){
	$database = "birds";
	$table = "json_file";
	$con = mysqli_connect("localhost", "root", "root", $database);
	$myfile = fopen("files/testfile.txt", "r");
	while(!feof($myfile)){
		fscanf($myfile, "%[^\n]", $line);
		$array = explode(" ", $line);
		$date = str_replace("T", " ", $array[1]);
		$date = str_replace("Z", "", $date);
		//echo $date;
		$sql = "INSERT INTO `birds`.`json_file` (`ID`, `Radar_ID`, `date`, `altitude`, `u_speed`, `v_speed`, `w_speed`, `ground`, `density`) VALUES (NULL, '$array[0]', '$date', '$array[2]', '$array[3]', '$array[4]', '$array[5]', '$array[6]', '$array[7]');";
		$result = mysqli_query($con, $sql) or die(mysql_error());
	}	
	mysqli_close($con);
	fclose($myfile);
	
}

function do_the_jump($start_time, $jump){
	$date = "2013-04-05 00:00:11";
	$end_time = "2013-04-11 23:55:34";
	$windows;
	$i = 0;
	while(strtotime($date) < strtotime($end_time)){
		$currentDate = strtotime($date);
		$futureDate = $currentDate+(60*$jump);
		$formatDate = date("Y-m-d H:i:s", $futureDate);
		$window[$i][0] = $date;
		$window[$i][1] = $formatDate;
		$futureDate = $currentDate+(60*5);
		$formatDate = date("Y-m-d H:i:s", $futureDate);
		$date = $formatDate;
		$i++;
	}
	return $window;
}

function calculate_ground(){
	$database = "birds";
	$con = mysqli_connect("localhost", "root", "root", $database);
	$sql = "SELECT `u_speed`, `v_speed`, `ID` FROM `json_file`";
	$result = mysqli_query($con, $sql) or die(mysql_error());
	while($row = mysqli_fetch_array($result)){
		$ground = ($row['u_speed']*$row['u_speed']) + ($row['v_speed']*$row['v_speed']);
		$ground = sqrt($ground);
		echo $ground . '</br>';
		$id = $row['ID'];
		$sql_2 = "UPDATE `birds`.`json_file` SET `ground` = '$ground' WHERE `json_file`.`ID` = '$id'";
		$result_2 = mysqli_query($con, $sql_2) or die(mysql_error());
	}
	mysqli_close($con);
}



function make_the_average(){
	$database = "birds";
	$radar_id = array("6410","6234","6260", "6451", "6477");
	$json_file = fopen("files/final.json", "a+");
	$altitude_array = array("0.3","0.5","0.7", "0.9", "1.1","1.3","1.5","1.7", "1.9", "2.1","2.3","2.5","2.7", "2.9", "3.1","3.3","3.5","3.7", "3.9");
	$table = "json_file";
	$v_speed = 0;
	$density = 0;
	$u_speed = 0;
	$con = mysqli_connect("localhost", "root", "root", $database);
	$window = do_the_jump("", 25);
while($j <2){
foreach($window as $time){
	$start = $time[0];
	$end = $time[1];
	foreach($altitude_array as $altitude){
		echo '</br>';
		$i = 0;
		foreach($radar_id as $id ){
			$sql = "SELECT `u_speed` FROM `json_file` WHERE `Radar_ID` = '$id' AND `altitude` LIKE '$altitude' AND `date` BETWEEN '$start' AND '$end'";
			$result = mysqli_query($con, $sql) or die(mysql_error());
			$number = mysqli_num_rows($result);
			while($row = mysqli_fetch_array($result)){
				$density += $row['u_speed'] / $number;
			}
			//echo $start . '-'. $end . '->'. $density . '</br>';
			$array[$i] = $density;
			$density = 0;
			$i++;
		}
		$line = '[' . $array[0] . ',' . $array[1] . ',' . $array[2] . ',' . $array[3] . ',' . $array[4] . '],'."\n";
		//echo $line;
		fwrite($json_file, $line);
	}
	fwrite($json_file, "],\n[");
	$j++;
	if($j == 2) break;
}
}
	mysqli_close($con);
	fclose($json_file);
}

echo calculate_ground();
//echo make_the_average();
?>