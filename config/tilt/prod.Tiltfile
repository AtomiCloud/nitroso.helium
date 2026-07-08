def start(landscape, platform, service, port, live):

    # build API image
    scheduler_image_name = platform + "-" + service + "-scheduler"
    docker_build(
        scheduler_image_name,
        '.',
        dockerfile = './infra/Dockerfile',
    )

    # build API image
    refunder_image_name = platform + "-" + service + "-refunder"
    docker_build(
        refunder_image_name,
        '.',
        dockerfile = './infra/Dockerfile',
    )

    # build API image
    reverter_image_name = platform + "-" + service + "-reverter"
    docker_build(
        reverter_image_name,
        '.',
        dockerfile = './infra/Dockerfile',
    )

    # Add Link
    k8s_resource(
       workload = api_image_name,
       links=[
         link('http://api.' + service + '.' + platform + '.' + landscape +  '.lvh.me:' + str(port) + '/swagger/index.html','API')
       ]
    )
