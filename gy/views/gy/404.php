<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>404 - <?=$this->admin_model->get_title();?></title>
    <?php $this->load->view('gy/head');?>
</head>
<body>
    <?php $this->load->view('gy/header');?>
    <div class="header jumbotron">
        <div class="container">
            <h1>Nothing found here at the moment. </h1>
            <p class="lead">You are in a place that nobody have visited.</p>            
        </div>
    </div>
    <div class="container">
        <div class="row cont404">
            <div class="col-sm-4 col-md-4">
                <div class="lhs404">
                    <h2>Page Not found</h2>
                    <p>and that's the error.</p>
                </div>
            </div>
            <div class="col-lg-offset-1 col-sm-7 col-md-7">
                <blockquote>
                    <div class="rhs404">
                        <p>Nothing else to say, <br>
                            This is just a an error page,<br>
                            showing you that <br>
                            you are going to somewhere wrong.</p>
                        <small>Just go back.</small>
                    </div>
                </blockquote>
            </div>
            <p><small>You are trying to access <?=current_url();?> which returns a HTTP 404 error.</small></p>
        </div>
    </div>
    <?php $this->load->view('gy/footer');?>
</body>
</html>