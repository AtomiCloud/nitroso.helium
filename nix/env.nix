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
  ];

  infra = [
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