{ pkgs, packages }:
with packages;
{
  system = [
    atomiutils
  ];

  dev = [
    pls
    git
    swagger_typescript_api
    mirrord
  ];

  infra = [
    atomiutils
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
    sg
  ];
}
