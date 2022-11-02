<?php
  $ditoHeader = $_SERVER['HTTP_CUSTOM_DITO'] ?? null;
  $testHeader = $_SERVER['HTTP_HEADER_TEST'] ?? null;
  $dito = $_GET['dito'] ?? null;
  $test = $_GET['test'] ?? null;
  $test2 = $_GET['test2'] ?? null;
  if (
    isset($ditoHeader) && $ditoHeader == 'dito'
    && isset($testHeader) && $testHeader == 'test'
    && isset($dito) && $dito == 'dito'
    && isset($test) && $test == 'test'
    && isset($test2) && $test2 == 'test2'
  ) {
    echo json_encode(['success' => true]);
  } else {
    echo json_encode(['success' => false]);
  }
