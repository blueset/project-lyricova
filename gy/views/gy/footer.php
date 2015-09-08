<footer>
	<div class="container">
		<p class="text-muted" style="margin: 20px 0;"><a href="http://blueset.github.io/project-lyricova/">Project Lyricova</a>, a free and open source blogging tool focused on lyrics created by <a href="http://1a23.com/">Blueset Studio</a> together with <a href="http://ilove.1a23.com/">iBe</a>.</p>
	</div>
</footer>
<script>
	currpath = "<?=site_url()?>";
	if (currpath[currpath.length-1] !== "/") {currpath = currpath + "/";}
</script>
<script src="https://code.jquery.com/jquery-2.1.1.min.js"></script>
<script src="<?=base_url('js/bootstrap.min.js');?>"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/masonry/3.3.2/masonry.pkgd.min.js"></script>
<script src="<?=base_url('js/gy.js');?>"></script>
<?php if(stripos(uri_string(),"admin")!==FALSE): ?><script src="<?=base_url('js/sb-admin.js');?>"></script><?php endif;?>
<?php if(stripos(uri_string(),"admin")!==FALSE): ?><script src="<?=base_url('js/metisMenu/jquery.metisMenu.js');?>"></script><?php endif;?>
