<?php
		$totalPage = $num / $pagesize;
		if($num % $pagesize != 0) {$totalPage+=1;}
		echo "\n";
		echo "<div class=\"pagination\">\n<ul>\n";
		if($page=1){echo '<li class="disabled"><a href="#">&laquo;</a></li>';echo "\n";}
			else{echo '<li><a href="'.$url.'?page='.($page-1).'">&laquo;</a></li>';echo "\n";}

		for($i=1;$i<=$totalPage;$i++){
			if ($i!=$page){
				echo '<li><a href="'.$url.'?page='.$i.'">'.$i.'</a></li>';echo "\n";
			}else{
				echo '<li class="active"><a href="#">'.$i.'</a></li>';echo "\n";
			}
		}
		if($page=$totalPage){echo '<li class="disabled"><a href="#">»</a></li>';}
			else{echo '<li><a href="'.$url.'?page='.($page+1).'">»</a></li>';echo "\n";}
		echo "</ul>\n</div>\n";
?>