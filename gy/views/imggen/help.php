<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Help - Image Generator - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="hero-unit header">
		<div class="container">
			<h1>Image Generator Help</h1>	
			<p class="lead">How to use Project Gy Image Generator.</p>
		</div>
	</div>
	<div class="container">
		<img src="<?=base_url('img/tutorial/imggen1.png')?>" alt="Interface" class="pull-right img-polaroid span4">
		<h1>Create and edit new image</h1>
		<p>
			By using Project Gy Image Generator, you are allowed to generate picture in any size and any style you want.
			To use this function, you could either click the <a href="javascript:void(0);" class="btn btn-small">Image Generator</a> button on the top navigation bar or on the single post page.
			Introductions of the settings are as following:
		</p>
		<dl class="dl-horizontal">
			<dt>Lyric</dt>
			<dd>Yor main text in the picture.</dd>
			<dt>Meta text</dt>
			<dd>Descriptional small text below lyrics.</dd>
			<dt>Text Position</dt>
			<dd>Position of text in the picture. (Text alignment will change accordingly.)</dd>
			<dt>Font</dt>
			<dd>Font of the texts. List of fonts can be found <a href="#fonts">here</a>.</dd>
			<dt>Background Picture</dt>
			<dd>A few amount of babkground pictures can be chosen. List of backgrounds can be found <a href="#bg">here</a>.</dd>
			<dt>Background Position</dt>
			<dd>Part of background picture being corped for generated image.</dd>
			<dt>Lyric font size</dt>
			<dd>Size of lyric text. Unit: px.</dd>
			<dt>Lyrics line height</dt>
			<dd>Height of each line of lyric text, including the height of text. Usually 15 or 20 px heigher than font size.</dd>
			<dt>Meta Font size</dt>
			<dd>Size of descriptional text, usually smaller than lyrics text. Unit: px.</dd>
			<dt>Meta line height.</dt>
			<dd>Height of descriptional small text, including the height of text. Usually 15 or 20 px heigher than font size. This can also be used to adjust the distance between lyric and meta text.</dd>
			<dt>Width & height</dt>
			<dd>Dimention of generated picture.</dd>
			<dt>X offset</dt>
			<dd>Horizontal distance of height from the nearest boundary. Not applicable for horizontally centered text.</dd>
			<dt>Y offset</dt>
			<dd>Vertical distance of height from the nearest boundary. Not applicable for vertically centered text.</dd>
			<dt>Text color</dt>
			<dd>Color of text generated. A white color is suitable for a dark background, and vice versa.</dd>
			<dt>Import post by ID</dt>
			<dd>This allows you to obtain lyric and meta text by emtering the ID of post. Post ID can be obtained from the address of a single page of a post. E.g. in the address <code><?=base_url('post/25')?></code> the post ID is 25.</dd>
		</dl>
		<div class="clearfix"></div>
		<h1>Share your image</h1>
		<p>Download button is provided after the image is created. You can download the picture to your computer and share it to anywhere you like.</p>
		<h1 id="fonts">List of fonts</h1>
		<p>Here are the list of fonts provided by Project Gy.</p>
		<table class="table table-bordered">
			<tr>
				<th>Font Name</th>
				<th>Preview</th>
			</tr>
			<?php foreach (array_keys($flist) as $font) : ?>
			<tr>
				<td><?=$flist[$font]?></td>
				<td><?php 
					echo '<img src="'.base_url('fonts/preview/'.$font.'-1.png').'" alt="'.$flist[$font].' Preview 1" />';
					$i=2;
					while (!(file_exists('./fonts/preview/'.$font.'-'.$i.'.png') == FALSE)) {
						echo '<br>';
						echo '<img src="'.base_url('fonts/preview/'.$font.'-'.$i.'.png').'" alt="'.$flist[$font].' Preview '.$i.'" />';
						$i+=1;
					}
				 ?></td>
			</tr>
		<?php endforeach; ?>
		</table>
		<h1 id="bg">List of Backgrounds</h1>
		<p>Here is the list of backgrounds and maximum dimentions for them.</p>
		<ul class="thumbnails">
			<?php for ($i=1; $i < $bgno+1; $i++) :?>
			<?php $image_size = getimagesize(base_url('img/bg/bg'.$i.'.png')); ?>
			<div class="col-sm-3 col-lg-3">
				<div class="panel panel-default" style="min-height:250px;">
				  				<div class="panel-body">
				    				<img src="<?=base_url('img/bg/bg'.$i.'.png')?>" alt="Background <?=$i?>" style="width:100%">
				  				</div>
				  				<div class="panel-footer">
				  					<h4>Background <?=$i?></h4>
						<p>Maximum dimention: <?=$image_size[0]?> x <?=$image_size[1]?></p>
					</div>
				</div>
			</div>

			<?php endfor; ?>
			
		</ul>
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>