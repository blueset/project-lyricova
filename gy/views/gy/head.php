<meta http-equiv="version" content="<?=$this->config->item('current_version');?>" />
<link rel="stylesheet" href="<?=base_url('/css/bootstrap.min.css')?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="<?=base_url('/css/bootstrap-responsive.css')?>">
<link rel="stylesheet" href="<?=base_url('/css/opa-icons.css')?>">
<link rel="stylesheet" href="<?=base_url('/css/font-awesome.min.css')?>">
<?php if(stripos(uri_string(),"admin")!==FALSE): ?><link rel="stylesheet" href="<?=base_url('/css/charisma-app.css')?>"><?php endif;?>
<?php if(stripos(uri_string(),"admin")!==FALSE): ?><link rel="stylesheet" href="<?=base_url('/css/sb-admin.css')?>"><?php endif;?>
<link rel="stylesheet" href="<?=base_url('/style.css')?>">
<style>
@font-face {
  font-family: 'FontAwesome';
  src: url('<?=base_url('/fonts/fontawesome-webfont.eot?v=4.0.3')?>');
  src: url('<?=base_url('/fonts/fontawesome-webfont.eot?#iefix&v=4.0.3')?>') format('embedded-opentype'), 
       url('<?=base_url('/fonts/fontawesome-webfont.woff?v=4.0.3')?>') format('woff'), 
       url('<?=base_url('/fonts/fontawesome-webfont.ttf?v=4.0.3')?>') format('truetype'), 
       url('<?=base_url('/fonts/fontawesome-webfont.svg#fontawesomeregular?v=4.0.3')?>') format('svg');
  font-weight: normal;
  font-style: normal;
}
</style>
