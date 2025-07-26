{ pkgs, atomi, pkgs-2505, pkgs-unstable }:
let
  all = {
    atomipkgs = (
      with atomi;
      {
        inherit
          mirrord
          atomiutils
          infrautils
          infralint
          swagger_typescript_api
          pls
          sg;
      }
    );
    nix-unstable = (
      with pkgs-unstable;
      { }
    );
    nix-2505 = (
      with pkgs-2505;
      {

        inherit
          # standard
          git
          infisical

          treefmt
          gitlint
          shellcheck
          biome

          # language
          bun;
      }
    );
  };
in
with all;
nix-2505 //
nix-unstable //
atomipkgs
