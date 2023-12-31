{ pkgs, packages }:
with packages;
{
  system = [
    coreutils
    findutils
    gnugrep
    gnused
    yq-go
    jq
  ];

  dev = [
    pls
    git
    swagger_typescript_api
    skopeo
    doppler
    mirrord
  ];

  infra = [
    k3d
    tilt
    helm
    kubectl
    docker
  ];

  main = [
    infisical
    bun
  ];

  lint = [
    # core
    treefmt
    gitlint
    shellcheck
    sg
  ];

  releaser = [
    nodejs
    sg
    npm
  ];
}
