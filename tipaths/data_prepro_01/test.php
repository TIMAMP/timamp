<?php
$date = "2015-04-03";
$datepart1 = substr($date, 0, -1);
$datepart2 = substr($date, -1) + 1;
//echo $datepart1 . $datepart2;

$date = strtotime($date)+24*60*60;
echo date('dd:mm:YY',$date);
?>