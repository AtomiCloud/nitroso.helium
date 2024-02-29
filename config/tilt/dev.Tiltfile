def start(landscape, platform, service, port, live):

    scheduler_image_name = platform + "-" + service + "-scheduler"
    docker_build(
        scheduler_image_name,
        '.',
        dockerfile = './infra/dev.Dockerfile',
        entrypoint='bun run ./src/index.ts schedule',
        live_update=[
            sync('.', '/app'),
        ]

    )

    refunder_image_name = platform + "-" + service + "-refunder"
    docker_build(
        refunder_image_name,
        '.',
        dockerfile = './infra/dev.Dockerfile',
        entrypoint='bun run ./src/index.ts refunder',
        live_update=[
            sync('.', '/app'),
        ]

    )
