<footer>
	<div class="container">
		<p class="text-muted" style="margin: 20px 0;"><a href="http://github.com/1a23/project-gy">Project Gy</a>, a lyric-centered web-log created by <a href="http://1a23.com/404.php">Blueset Studio</a> together with <a href="http://ilove.1a23.com/">iBe</a>.</p>
	</div>
</footer>
<script>
	currpath = "<?=site_url()?>";
	if (currpath[currpath.length-1] !== "/") {currpath = currpath + "/";}
</script>
<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.10.1/jquery.min.js"></script>
<script src="<?=base_url('js/bootstrap.min.js');?>"></script>
<script src="<?=base_url('js/jquery.masonry.min.js');?>"></script>
<script src="<?=base_url('js/gy.js');?>"></script>
<?php if(stripos(uri_string(),"admin")!==FALSE): ?><script src="<?=base_url('js/sb-admin.js');?>"></script><?php endif;?>
<?php if(stripos(uri_string(),"admin")!==FALSE): ?><script src="<?=base_url('js/metisMenu/jquery.metisMenu.js');?>"></script><?php endif;?>
