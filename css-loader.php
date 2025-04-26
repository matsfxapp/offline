<?php
$file = $_GET['file'];
if (file_exists("css/$file.css")) {
    header("Content-Type: text/css");
    readfile("css/$file.css");
}
?>
