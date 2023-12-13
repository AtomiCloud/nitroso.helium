{ pkgs, pkgs-2305, atomi, atomi_classic, pkgs-dec-12-23 }:
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
          infisical
          pls;
      }
    );
    nix-2305 = (
      with pkgs-2305;
      { }
    );
    dec-12-23 = (
      with pkgs-dec-12-23;
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

          git

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
dec-12-23
