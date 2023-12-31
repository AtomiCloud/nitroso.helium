{ pkgs, pkgs-2305, atomi, atomi_classic, pkgs-dec-31-23 }:
let
  all = {
    atomipkgs_classic = (
      with atomi_classic;
      {
        inherit
          sg;
      }
    );
    atomipkgs = (
      with atomi;
      {
        inherit
          mirrord
          swagger_typescript_api
          infisical
          pls;
      }
    );
    nix-2305 = (
      with pkgs-2305;
      { }
    );
    dec-31-23 = (
      with pkgs-dec-31-23;
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
atomipkgs_classic //
dec-31-23
