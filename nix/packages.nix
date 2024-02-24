{ pkgs, pkgs-2305, atomi, pkgs-feb-23-24 }:
let
  all = {
    atomipkgs = (
      with atomi;
      {
        inherit
          mirrord
          swagger_typescript_api
          infisical
          pls
          sg;
      }
    );
    nix-2305 = (
      with pkgs-2305;
      { }
    );
    feb-23-24 = (
      with pkgs-feb-23-24;
      {
        nodejs = nodejs_18;
        npm = nodePackages.npm;
        helm = kubernetes-helm;
        inherit
          coreutils
          yq-go
          gnused
          gnugrep
          bash
          jq
          findutils
          hadolint
          helm-docs
          kubectl
          docker
          skopeo
          k3d
          tilt
          git
          doppler

          bun
          treefmt
          gitlint
          shellcheck
          ;
      }
    );
  };
in
with all;
nix-2305 //
atomipkgs //
feb-23-24
