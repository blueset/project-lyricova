<div id="disqus_thread"></div>
    <script type="text/javascript">
        
        var disqus_shortname = '<?=$this->config->item('disqus_sname');?>'; 
        var disqus_identifier = '<?=$this->config->item('subclass_prefix');?><?=$comment_id;?>';
        
        (function() {
            var dsq = document.createElement('script'); dsq.type = 'text/javascript'; dsq.async = true;
            dsq.src = '//' + disqus_shortname + '.disqus.com/embed.js';
            (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(dsq);
        })();
    </script>
    <noscript><?=lang('main_comment_noscript');?></noscript>
    
    <a href="http://disqus.com" class="dsq-brlink"><?=lang('main_comment_link');?></a>
    